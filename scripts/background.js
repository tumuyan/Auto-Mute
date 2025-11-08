// 正在播放声音的标签
var tabNow = -1;
// 前台标签
var tabActive = -1;
var sw_on = true;
var sw_audible = true;
var options = {};
var isInitialized = false;
var processingTabChange = false;

// 初始化函数，确保所有异步操作完成后再标记为已初始化
async function initialize() {
    try {
        const data = await chrome.storage.local.get(null);
        options = data || {};
        sw_on = options.autoMute !== false;
        sw_audible = options.onlyAudible !== false;

        options.onlyAudible = sw_audible;
        options.autoMute = sw_on;
        await chrome.storage.local.set(options);
        
        // 从storage恢复tabNow和tabActive状态（确保是数值类型）
        if (options.tabNow !== undefined && typeof options.tabNow === 'number') {
            tabNow = options.tabNow;
        }
        if (options.tabActive !== undefined && typeof options.tabActive === 'number') {
            tabActive = options.tabActive;
        }
        
        isInitialized = true;
        console.log('Extension initialized:', options);
    } catch (error) {
        console.error('Initialization error:', error);
        isInitialized = true; // 即使出错也标记为已初始化，避免阻塞
    }
}

// 立即初始化并记录初始化Promise
const initializationPromise = initialize();

async function ensureInitialized() {
    if (!isInitialized) {
        try {
            await initializationPromise;
        } catch (error) {
            console.error('ensureInitialized error:', error);
        }
    }
}

chrome.storage.onChanged.addListener(async (changes, area) => {
    await ensureInitialized();

    if (area === 'local') {
        if (changes.autoMute != undefined) {
            options.autoMute = changes.autoMute.newValue;
            sw_on = options.autoMute;

            if (sw_on) {
                await muteAll(true);

                try {
                    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                    if (tabs && tabs.length > 0) {
                        const tab = tabs[0];
                        tabNow = tab.id;
                        tabActive = tab.id;
                        options.tabNow = tabNow;
                        options.tabActive = tabActive;
                        await chrome.tabs.update(tab.id, { muted: false });
                        
                        // 持久化状态
                        await chrome.storage.local.set({ tabNow: tabNow, tabActive: tabActive });
                    }
                } catch (error) {
                    console.error('Error in autoMute change handler:', error);
                }
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
    await ensureInitialized();
    
    const tabId = activeInfo.tabId;
    console.log("onSelectionChanged: " + tabActive + " -> " + tabId + ", autoMute=" + options.autoMute);

    if (processingTabChange) {
        console.log('Tab change is already being processed, skipping:', tabId);
        return;
    }
    processingTabChange = true;

    const previousTabActive = tabActive;
    tabActive = tabId;
    options.tabActive = tabActive;

    try {
        const tab = await chrome.tabs.get(tabId);
        
        if (!tab) {
            console.warn('Tab not found:', tabId);
            return;
        }
        
        let muted = tab.active ? false : true;
        await chrome.tabs.update(tabId, { muted: muted });

        // 不智能跳过，或者智能跳过但是这个页面发音
        if (!sw_audible || tab.audible) {
            if (tabNow != tabId) {
                if (tabNow > 0) {
                    try {
                        // 验证之前的tab是否仍然存在
                        await chrome.tabs.get(tabNow);
                        await chrome.tabs.update(tabNow, { muted: true });
                    } catch (error) {
                        console.warn('Previous tab no longer exists:', tabNow, error);
                    }
                }
                tabNow = tabId;
                options.tabNow = tabNow;
                options.tabActive = tabActive;
                
                // 持久化状态
                await chrome.storage.local.set({ tabNow: tabNow, tabActive: tabActive });
            }
        } else {
            // 持久化tabActive状态
            options.tabActive = tabActive;
            await chrome.storage.local.set({ tabActive: tabActive });
        }

    } catch (e) {
        console.error("Error-Mute-Tab-" + tabId + ":", e);
        // 恢复previousTabActive以防止状态不一致
        tabActive = previousTabActive;
        options.tabActive = tabActive;
    } finally {
        processingTabChange = false;
    }

}

chrome.tabs.onActivated.addListener(async function (tab) {
    await ensureInitialized();

    if (!sw_on) {
        console.log("onSelectionChanged: " + tab.tabId + " exit, autoMute=" + options.autoMute);
        return;
    }

    try {
        await insertScript(tab);
    } catch (error) {
        console.error('Error handling onActivated event:', error);
    }
});

chrome.windows.onFocusChanged.addListener(async function (windowId) {
    await ensureInitialized();

    if (!sw_on) {
        return;
    }

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
    }

    try {
        const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
        if (!tabs || tabs.length === 0) {
            return;
        }

        await insertScript({ tabId: tabs[0].id, windowId: windowId });
    } catch (error) {
        console.error('Error handling onFocusChanged event:', error);
    }
});


// 如果智能跳过，需要检查前台标签内容更新时自动发声; 否则切换标签页时已经处理
chrome.tabs.onUpdated.addListener(async function (id, info, tab) {
    await ensureInitialized();
    
    if (!sw_on) {
        return;
    }
    
    try {
        if (options.onlyAudible && id == tabActive && id != tabNow && tab.audible) {
            await chrome.tabs.update(id, { muted: false });
            
            if (tabNow > 0) {
                try {
                    // 验证之前的tab是否仍然存在
                    await chrome.tabs.get(tabNow);
                    await chrome.tabs.update(tabNow, { muted: true });
                } catch (error) {
                    console.warn('Previous tab no longer exists in onUpdated:', tabNow, error);
                }
            }
            
            tabNow = tabActive;
            options.tabNow = tabNow;
            
            // 持久化状态
            await chrome.storage.local.set({ tabNow: tabNow });
        }
    } catch (error) {
        console.error('Error in onUpdated listener:', error);
    }
});

async function muteAll(mute) {
    await ensureInitialized();

    try {
        const windows = await chrome.windows.getAll({ populate: true });
        
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
        console.error('muteAll error:', error);
    }
}
