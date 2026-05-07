document.addEventListener('DOMContentLoaded', () => {
    console.log('Aura Ultraviolet UI Initializing...');
    
    const urlInput = document.getElementById('url-input');
    const goBtn = document.getElementById('go-btn');
    const mainUi = document.getElementById('main-ui');
    const proxyContainer = document.getElementById('proxy-container');
    const proxyFrame = document.getElementById('proxy-frame');
    const backHome = document.getElementById('back-home');
    const displayUrl = document.getElementById('current-display-url');

    // Service Worker の登録
    const swPath = '/uv/uv.sw.js';
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(swPath, {
            scope: __uv$config.prefix
        }).then(() => {
            console.log('UV Service Worker: Registered');
        }).catch(err => {
            console.error('UV Service Worker: Registration Failed', err);
        });
    }

    function launchProxy() {
        let url = urlInput.value.trim();
        if (!url) return;

        // 検索またはURL補完
        if (!url.includes('.') || url.includes(' ')) {
            url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
        } else if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        console.log('UV Engine: Launching to ' + url);

        // Ultraviolet 形式のURL生成 (/uv/service/...)
        const proxyUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

        // UI切り替え
        mainUi.classList.add('hidden');
        proxyContainer.classList.remove('hidden');
        
        // フレームに読み込み
        proxyFrame.src = proxyUrl;
        displayUrl.textContent = `Aura UV: ${url}`;
    }

    goBtn.addEventListener('click', launchProxy);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') launchProxy();
    });

    backHome.addEventListener('click', () => {
        proxyContainer.classList.add('hidden');
        mainUi.classList.remove('hidden');
        proxyFrame.src = 'about:blank';
        urlInput.value = '';
    });
});
