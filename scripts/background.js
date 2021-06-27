var tabNow = -1;
var sw_on = true;

if(localStorage['sw_on']=="false")
    sw_on = false;
sw(sw_on);


chrome.tabs.onSelectionChanged.addListener(function (tabId, selectInfo) {
    if(!sw_on)
        return;
    console.log("onSelectionChanged: " + tabNow + "->" + tabId);
    try {
        chrome.tabs.update(tabNow, { muted: true });
    } catch (e) {
        console.log("Error-Mute-Tab-" + tabNow + "\n" + e);
    }

    chrome.tabs.update(tabId, { muted: false });
    tabNow = tabId;
});

function sw(sw){
    sw_on = sw;
    localStorage['sw_on']=sw_on;

    if(sw_on){
        muteAll(true);
        chrome.tabs.getSelected(function (tab) {
            tabNow=tab.id;
            chrome.tabs.update(tab.id, { muted: false });
        })
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