var sw_on =true;
if(localStorage['sw_on']=='false')
sw_on=false ;

var sw_audible = true;
if(localStorage['audible']=='false')
sw_audible=false;

document.addEventListener('DOMContentLoaded', function () {

    var auto = document.getElementById('auto');
    auto.textContent = chrome.i18n.getMessage("autoMute");

    var mute = document.getElementById('mute');
    mute.textContent = chrome.i18n.getMessage("allMute");

    var unmute = document.getElementById('unmute');
    unmute.textContent = chrome.i18n.getMessage("unMute");

    var audible = document.getElementById('audible');
    audible.textContent = chrome.i18n.getMessage("audible");

    if (sw_on){
        auto.setAttribute("sw", "on");
    }  else {
        auto.setAttribute("sw", "off");
    }

    if (sw_audible){
        audible.setAttribute('sw',"on");
    }else{
        audible.setAttribute("sw","off");
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


    audible.onclick = function(){
        sw_audible = !sw_audible;

        var bg=chrome.extension.getBackgroundPage();
        bg.sw2(sw_audible);

        if (sw_audible){
            audible.setAttribute('sw',"on");
        }else{
            audible.setAttribute("sw","off");
        }   
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