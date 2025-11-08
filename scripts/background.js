// 正在播放声音的标签
var tabNow = -1;
// 历史播放声音的标签，用于在标签关闭时回退
var tabHistory = [];
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
        
        // 从storage恢复tabNow、tabHistory和tabActive状态
        if (options.tabNow !== undefined && typeof options.tabNow === 'number') {
            tabNow = options.tabNow;
        }
        if (options.tabHistory !== undefined && Array.isArray(options.tabHistory)) {
            tabHistory = options.tabHistory.filter(id => typeof id === 'number');
        }
        if (options.tabActive !== undefined && typeof options.tabActive === 'number') {
            tabActive = options.tabActive;
        }

        options.tabNow = tabNow;
        options.tabHistory = tabHistory;
        options.tabActive = tabActive;
        
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

// 添加标签到历史记录（保留最近的5个）
function addToHistory(tabId) {
    if (tabId <= 0) return;
    
    // 移除重复的
    tabHistory = tabHistory.filter(id => id !== tabId);
    
    // 添加到开头
    tabHistory.unshift(tabId);
    
    // 只保留最近的5个
    if (tabHistory.length > 5) {
        tabHistory = tabHistory.slice(0, 5);
    }
    
    options.tabHistory = tabHistory;
}

// 从历史记录中移除标签
function removeFromHistory(tabId) {
    if (tabId <= 0) return;
    tabHistory = tabHistory.filter(id => id !== tabId);
    options.tabHistory = tabHistory;
}

// 获取历史记录中的第一个有效标签
async function getValidTabFromHistory() {
    for (let i = 0; i < tabHistory.length; i++) {
        const historyTabId = tabHistory[i];
        try {
            await chrome.tabs.get(historyTabId);
            tabHistory.splice(i, 1);
            options.tabHistory = tabHistory;
            return historyTabId;
        } catch (error) {
            console.warn('Tab in history no longer exists:', historyTabId);
            tabHistory.splice(i, 1);
            options.tabHistory = tabHistory;
            i--;
        }
    }
    options.tabHistory = tabHistory;
    return -1;
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
                        tabHistory = [];
                        options.tabNow = tabNow;
                        options.tabActive = tabActive;
                        options.tabHistory = tabHistory;
                        await chrome.tabs.update(tab.id, { muted: false });
                        
                        // 持久化状态
                        await chrome.storage.local.set({ tabNow: tabNow, tabActive: tabActive, tabHistory: tabHistory });
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
                        // 添加当前的tabNow到历史记录
                        addToHistory(tabNow);
                    } catch (error) {
                        console.warn('Previous tab no longer exists:', tabNow, error);
                        removeFromHistory(tabNow);
                    }
                }
                tabNow = tabId;
                removeFromHistory(tabNow);
                options.tabNow = tabNow;
                options.tabActive = tabActive;
                options.tabHistory = tabHistory;
                
                // 持久化状态
                await chrome.storage.local.set({ tabNow: tabNow, tabHistory: tabHistory, tabActive: tabActive });
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
                    addToHistory(tabNow);
                } catch (error) {
                    console.warn('Previous tab no longer exists in onUpdated:', tabNow, error);
                    removeFromHistory(tabNow);
                }
            }
            
            tabNow = tabActive;
            removeFromHistory(tabNow);
            options.tabNow = tabNow;
            options.tabHistory = tabHistory;
            
            // 持久化状态
            await chrome.storage.local.set({ tabNow: tabNow, tabHistory: tabHistory });
        }
    } catch (error) {
        console.error('Error in onUpdated listener:', error);
    }
});

chrome.tabs.onRemoved.addListener(async function (tabId, removeInfo) {
    await ensureInitialized();

    console.log('Tab removed:', tabId, 'tabNow:', tabNow, 'tabHistory:', tabHistory);

    removeFromHistory(tabId);

    if (tabId !== tabNow) {
        try {
            await chrome.storage.local.set({ tabHistory: tabHistory });
        } catch (error) {
            console.error('Failed to persist tabHistory on removal:', error);
        }
        return;
    }

    console.log('Removed tab was tabNow, attempting to unmute from history');

    tabNow = -1;
    options.tabNow = tabNow;

    if (!sw_on) {
        try {
            await chrome.storage.local.set({ tabNow: tabNow, tabHistory: tabHistory });
        } catch (error) {
            console.error('Failed to persist state when auto mute disabled on removal:', error);
        }
        return;
    }

    const fallbackTabId = await getValidTabFromHistory();

    if (fallbackTabId > 0) {
        try {
            await chrome.tabs.update(fallbackTabId, { muted: false });
            tabNow = fallbackTabId;
            options.tabNow = tabNow;
            console.log('Successfully unmuted fallback tab:', fallbackTabId);
            await chrome.storage.local.set({ tabNow: tabNow, tabHistory: tabHistory });
            return;
        } catch (error) {
            console.error('Failed to unmute fallback tab:', fallbackTabId, error);
        }
    }

    console.log('No valid tab found in history, trying to unmute active tab');
    
    try {
        let activeTabs = [];
        if (removeInfo && removeInfo.windowId !== undefined && removeInfo.windowId !== chrome.windows.WINDOW_ID_NONE) {
            activeTabs = await chrome.tabs.query({ active: true, windowId: removeInfo.windowId });
        }
        if (!activeTabs || activeTabs.length === 0) {
            activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        }
        if (activeTabs && activeTabs.length > 0) {
            const activeTab = activeTabs[0];
            await chrome.tabs.update(activeTab.id, { muted: false });
            if (!sw_audible || activeTab.audible) {
                tabNow = activeTab.id;
                removeFromHistory(tabNow);
                options.tabNow = tabNow;
                tabActive = activeTab.id;
                options.tabActive = tabActive;
                console.log('Successfully unmuted active tab:', activeTab.id);
            }
        }
    } catch (error) {
        console.error('Failed to unmute active tab:', error);
    }

    try {
        await chrome.storage.local.set({ tabNow: tabNow, tabHistory: tabHistory, tabActive: tabActive });
    } catch (error) {
        console.error('Failed to persist state after removal:', error);
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
