var sw_on = true;
if (localStorage['sw_on'] == 'false')
    sw_on = false;

var sw_audible = true;
if (localStorage['audible'] == 'false')
    sw_audible = false;

let queryActiveOptions = { active: true, lastFocusedWindow: true };

document.addEventListener('DOMContentLoaded', function () {

    // 自动静音
    var auto = document.getElementById('auto');
    auto.textContent = chrome.i18n.getMessage("autoMute");

    // 静音全部
    var mute = document.getElementById('mute');
    mute.textContent = chrome.i18n.getMessage("allMute");

    // 恢复全部
    var unmute = document.getElementById('unmute');
    unmute.textContent = chrome.i18n.getMessage("unMute");

    // 跳过不发音标签
    var audible = document.getElementById('audible');
    audible.textContent = chrome.i18n.getMessage("audible");

    // 静音/恢复当前标签
    var muteactive = document.getElementById('muteactive');
    muteactive.textContent = chrome.i18n.getMessage("unmuteactive");

    chrome.tabs.query(queryActiveOptions, ([tab]) => {
        if (chrome.runtime.lastError)
            console.error(chrome.runtime.lastError);

        console.log(tab.mutedInfo);
        let activeMute = tab.mutedInfo.muted;
        if (activeMute)
            muteactive.setAttribute("sw", "off");
        else
            muteactive.setAttribute("sw", "on");
    });


    let bg = chrome.extension.getBackgroundPage();

    if (sw_on) {
        auto.setAttribute("sw", "on");
    } else {
        auto.setAttribute("sw", "off");
    }

    if (sw_audible) {
        audible.setAttribute('sw', "on");
    } else {
        audible.setAttribute("sw", "off");
    }

    auto.onclick = function () {
        sw_on = autoMute(!sw_on);
        if (sw_on) {
            auto.setAttribute("sw", "on");
        } else {
            auto.setAttribute("sw", "off");
        }
    }


    audible.onclick = function () {
        sw_audible = !sw_audible;

        var bg = chrome.extension.getBackgroundPage();
        bg.sw2(sw_audible);

        if (sw_audible) {
            audible.setAttribute('sw', "on");
        } else {
            audible.setAttribute("sw", "off");
        }
    }

    mute.onclick = function () {
        console.log('mute');
        muteAll(true);
    }

    unmute.onclick = function () {
        console.log('unute');
        muteAll(false);

        sw_on = autoMute(false)
        auto.setAttribute("sw", "off");
    }

    muteactive.onclick = function () {

        chrome.tabs.query(queryActiveOptions, ([tab]) => {
            if (chrome.runtime.lastError)
                console.error(chrome.runtime.lastError);

            console.log(tab.mutedInfo);
            let activeMute = !tab.mutedInfo.muted;
            chrome.tabs.update(tab.id, { muted: activeMute });
            if (activeMute)
                muteactive.setAttribute("sw", "off");
            else
                muteactive.setAttribute("sw", "on");
        });
    }


});


function muteAll(mute) {

    if (!mute) {
        var bg = chrome.extension.getBackgroundPage();
        bg.sw(false);
    }

    chrome.windows.getAll({ populate: true }, function (windows) {
        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                chrome.tabs.update(tab.id, { muted: mute });
            });
        });
    });
}

function autoMute(on) {
    sw_on = on;
    var bg = chrome.extension.getBackgroundPage();
    bg.sw(sw_on);
    console.log('autoMute: ' + sw_on);
    return sw_on;
}
