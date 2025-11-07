// 静音/恢复当前标签
var btnMuteActive
var options = {};

let queryActiveOptions = { active: true, lastFocusedWindow: true };

document.addEventListener('DOMContentLoaded', function () {

    // 自动静音
    var btnAuto = document.getElementById('auto');
    btnAuto.textContent = chrome.i18n.getMessage("autoMute");

    // 静音全部
    var btnMute = document.getElementById('mute');
    btnMute.textContent = chrome.i18n.getMessage("allMute");

    // 恢复全部
    var btnUnMute = document.getElementById('unmute');
    btnUnMute.textContent = chrome.i18n.getMessage("unMute");

    // 跳过不发音标签
    var btmOnlyAudible = document.getElementById('audible');
    btmOnlyAudible.textContent = chrome.i18n.getMessage("audible");

    // 静音/恢复当前标签
    btnMuteActive = document.getElementById('muteactive');
    btnMuteActive.textContent = chrome.i18n.getMessage("unmuteactive");

    chrome.storage.local.get(null, async (data) => {
        options = data;
        console.log(options);

        if (options.autoMute) {
            btnAuto.setAttribute("sw", "on");
        } else {
            btnAuto.setAttribute("sw", "off");
        }

        if (options.onlyAudible) {
            btmOnlyAudible.setAttribute('sw', "on");
        } else {
            btmOnlyAudible.setAttribute("sw", "off");
        }

        {
            let [tab] = await chrome.tabs.query(queryActiveOptions);
            if (tab == undefined) {
                console.log("active tab = null")
            } else {
                console.log(tab)
                let activeMute = tab.mutedInfo.muted;
                if (activeMute == true)
                    btnMuteActive.setAttribute("sw", "off");
                else
                    btnMuteActive.setAttribute("sw", "on");
            }
        }

    });


    btnAuto.onclick = function () {
        options.autoMute = !options.autoMute;
        if (options.autoMute) {
            btnAuto.setAttribute("sw", "on");
        } else {
            btnAuto.setAttribute("sw", "off");
        }
        chrome.storage.local.set(options, function () { });
    }


    btmOnlyAudible.onclick = function () {
        options.onlyAudible = !options.onlyAudible;

        if (options.onlyAudible) {
            btmOnlyAudible.setAttribute('sw', "on");
        } else {
            btmOnlyAudible.setAttribute("sw", "off");
        }

        chrome.storage.local.set(options, function () { });
    }

    btnMute.onclick = async function () {
        console.log('mute');
        await muteAll(true);
    }

    btnUnMute.onclick = async function () {
        console.log('unute');
        await muteAll(false);

        options.autoMute = false;
        btnAuto.setAttribute("sw", "off");

        chrome.storage.local.set(options, function () { });
    }

    btnMuteActive.onclick = function () {

        chrome.tabs.query(queryActiveOptions, async ([tab]) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }

            if (!tab) {
                console.warn('No active tab found when toggling mute state');
                return;
            }

            if (!tab.mutedInfo) {
                console.warn('Muted info is unavailable for the active tab');
                return;
            }

            console.log(tab.mutedInfo);
            let activeMute = !tab.mutedInfo.muted;
            try {
                await chrome.tabs.update(tab.id, { muted: activeMute });
                if (activeMute)
                    btnMuteActive.setAttribute("sw", "off");
                else
                    btnMuteActive.setAttribute("sw", "on");
            } catch (error) {
                console.error('Failed to toggle mute state for active tab:', error);
            }
        });
    }


});


async function muteAll(mute) {

    if (mute)
        btnMuteActive.setAttribute("sw", "off");
    else
        btnMuteActive.setAttribute("sw", "on");

    try {
        const windows = await chrome.windows.getAll({ populate: true });
        
        if (!windows) {
            console.warn('No windows found');
            return;
        }
        
        for (const window of windows) {
            if (!window.tabs) {
                continue;
            }
            
            for (const tab of window.tabs) {
                try {
                    await chrome.tabs.update(tab.id, { muted: mute });
                } catch (error) {
                    console.warn('Failed to update tab mute state:', tab.id, error);
                }
            }
        }
    } catch (error) {
        console.error('muteAll error in popup:', error);
    }
}

