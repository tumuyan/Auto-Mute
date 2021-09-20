var tabNow = -1;
var sw_on = true;

if (localStorage['sw_on'] == 'false')
    sw_on = false;
sw(sw_on);

var sw_audible = true;
if (localStorage['audible'] == 'false')
    sw_audible = false;
sw2(sw_audible);

chrome.tabs.onActivated.addListener(function (activeInfo) {
    console.log("onSelectionChanged: tabid-> " +  activeInfo.tabId + " sw_on="+sw_on);   
    if (!sw_on)
        return;

    try {
        let tabId = activeInfo.tabId;
        chrome.tabs.get(tabId, async (tab) => {

            let muted = tab.active?false:true;
            await chrome.tabs.update(tabId, { muted });

            if(!sw_audible || tab.audible){
                if(tabNow != tabId){
                    await chrome.tabs.update(tabNow, { muted:true} );
                    tabNow = tabId;
                }
            }
            console.log(`Tab ${tab.id} is ${muted ? 'muted' : 'unmuted' }  audiable=${tab.audible}`);
          });

    } catch (e) {
        console.log("Error-Mute-Tab-" + tabNow + "\n" + e);
    }

});

function sw(sw) {
    sw_on = sw;
    localStorage['sw_on'] = sw_on;

    if (sw_on) {
        muteAll(true);

        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
            tabNow = tab.id;
            chrome.tabs.update(tab.id, { muted: false });
        });
    }
}

function sw2(sw) {
    sw_audible = sw;
    localStorage['audible'] = sw_audible;

    if (sw_audible) {
        muteAll(true);

        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
            tabNow = tab.id;
            chrome.tabs.update(tab.id, { muted: false });
        });
    }
}


function muteAll(mute) {
    chrome.windows.getAll({ populate: true }, function (windows) {
        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                chrome.tabs.update(tab.id, { muted: mute });
            });
        });
    });
}