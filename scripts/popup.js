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

    btnMute.onclick = function () {
        console.log('mute');
        muteAll(true);
    }

    btnUnMute.onclick = function () {
        console.log('unute');
        muteAll(false);

        options.autoMute = false;
        btnAuto.setAttribute("sw", "off");

        chrome.storage.local.set(options, function () { });
    }

    btnMuteActive.onclick = function () {

        chrome.tabs.query(queryActiveOptions, ([tab]) => {
            if (chrome.runtime.lastError)
                console.error(chrome.runtime.lastError);

            console.log(tab.mutedInfo);
            let activeMute = !tab.mutedInfo.muted;
            chrome.tabs.update(tab.id, { muted: activeMute });
            if (activeMute)
                btnMuteActive.setAttribute("sw", "off");
            else
                btnMuteActive.setAttribute("sw", "on");
        });
    }


});


function muteAll(mute) {

    if (mute)
        btnMuteActive.setAttribute("sw", "off");
    else
        btnMuteActive.setAttribute("sw", "on");

    chrome.windows.getAll({ populate: true }, function (windows) {
        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                chrome.tabs.update(tab.id, { muted: mute });
            });
        });
    });
}

