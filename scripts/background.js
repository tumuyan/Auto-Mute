// 正在播放声音的标签
var tabNow = -1;
// 前台标签
var tabActive = -1;
var sw_on = true;
var sw_audible = true;
var options = {};
chrome.storage.local.get(null, (data) => {
    options = data
    sw_on = options.autoMute != false;
    sw_audible = options.onlyAudible != false;

    options.onlyAudible = sw_audible;
    options.autoMute = sw_on;
    chrome.storage.local.set(options, function () { });
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.autoMute != undefined) {
            options.autoMute = changes.autoMute.newValue;
            sw_on = options.autoMute;

            if (sw_on) {
                muteAll(true);

                chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
                    tabNow = tab.id;
                    chrome.tabs.update(tab.id, { muted: false });
                });
            }
        }
        if (changes.onlyAudible != undefined) {
            options.onlyAudible = changes.onlyAudible.newValue;
            sw_audible = options.onlyAudible;
        }
        console.log("storage.onChanged new:");
        console.log(changes);
    }
});


async function insertScript(activeInfo) {
    console.log("onSelectionChanged: " + tabActive + " -> " + activeInfo.tabId + ", autoMute=" + options.autoMute);

    tabActive = activeInfo.tabId;

    try {
        let tabId = activeInfo.tabId;
        const tab = await chrome.tabs.get(tabId);
        let muted = tab.active ? false : true;
        await chrome.tabs.update(tabId, { muted: muted });

        // 不智能跳过，或者智能跳过但是这个页面发音
        if (!sw_audible || tab.audible) {
            if (tabNow != tabId) {
                if (tabNow > 0)
                    await chrome.tabs.update(tabNow, { muted: true });
                tabNow = tabId;
            }
        }
        // console.log(`Tab ${tab.id} is ${muted ? 'muted' : 'unmuted'}  audiable=${tab.audible}`);

    } catch (e) {
        console.log("Error-Mute-Tab-" + tabNow + "\n" + e);
    }

}

chrome.tabs.onActivated.addListener(function (tab) {
    if (!sw_on) {
        console.log("onSelectionChanged: " + tab.tabId + " exit, autoMute=" + options.autoMute);
        return;
    }

    setTimeout(function () {
        insertScript(tab);
    }, 0);
});


// 如果智能跳过，需要检查前台标签内容更新时自动发声; 否则切换标签页时已经处理
chrome.tabs.onUpdated.addListener(async function (id, info, tab) {
    if (options.onlyAudible && id == tabActive && id != tabNow && tab.audible) {
        await chrome.tabs.update(id, { muted: false });
        if (tabNow > 0)
            await chrome.tabs.update(tabNow, { muted: true });
        tabNow = tabActive;
    }
});
/* 
function sw(sw) {
    sw_on = sw;
    if (sw_on) {
        muteAll(true);

        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
            tabNow = tab.id;
            chrome.tabs.update(tab.id, { muted: false });
        });
    }

    options.autoMute = sw_on;
    chrome.storage.local.set(options, function () { });
}

function sw2(sw) {
    sw_audible = sw;

    if (sw_audible) {
        muteAll(true);

        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tab) {
            tabNow = tab.id;
            chrome.tabs.update(tab.id, { muted: false });
        });


        options.onlyAudible = sw_audible;
        chrome.storage.local.set(options, function () { });
    }
}
 */
function muteAll(mute) {
    chrome.windows.getAll({ populate: true }, function (windows) {
        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                chrome.tabs.update(tab.id, { muted: mute });
            });
        });
    });
}