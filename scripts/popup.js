var sw_on =true;
if(localStorage['sw_on']=="false")
sw_on=false ;
document.addEventListener('DOMContentLoaded', function () {

    var auto = document.getElementById('auto');
    auto.textContent = chrome.i18n.getMessage("autoMute");

    var mute = document.getElementById('mute');
    mute.textContent = chrome.i18n.getMessage("allMute");

    var unmute = document.getElementById('unmute');
    unmute.textContent = chrome.i18n.getMessage("unMute");

    if (sw_on){
        auto.setAttribute("sw", "on");
    }  else {
        auto.setAttribute("sw", "off");
    }

    auto.onclick = function () {
        sw_on = !sw_on;

        var bg = chrome.extension.getBackgroundPage();
        bg.sw(sw_on);

        if (sw_on){
            auto.setAttribute("sw", "on");
        }  else {
            auto.setAttribute("sw", "off");
        }
        console.log('auto');
    }
    mute.onclick = function () {
        console.log('mute');
        muteAll(true);
    }

    unmute.onclick = function () {
        console.log('unute');
        muteAll(false);

        sw_on=false;
        auto.setAttribute("sw", "on");
    }


});


function muteAll(mute) {

    if(!mute){
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