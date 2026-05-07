document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const goBtn = document.getElementById('go-btn');
    const mainUi = document.getElementById('main-ui');
    const proxyContainer = document.getElementById('proxy-container');
    const proxyFrame = document.getElementById('proxy-frame');
    const backHome = document.getElementById('back-home');
    const displayUrl = document.getElementById('current-display-url');

    // URLをBase64でエンコード（フィルター回避のため）
    function encodeUrl(url) {
        if (!url) return '';
        // http(s):// が抜けている場合は補完
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        return btoa(url);
    }

    function launchProxy() {
        const url = urlInput.value.trim();
        if (!url) return;

        const encoded = encodeUrl(url);
        const proxyUrl = `/gateway?url=${encoded}`;

        // UI切り替え
        mainUi.classList.add('hidden');
        proxyContainer.classList.remove('hidden');
        
        // フレームに読み込み
        proxyFrame.src = proxyUrl;
        displayUrl.textContent = `Aura Secure Tunnel: ${url}`;
        
        console.log(`Launching secure tunnel to: ${url}`);
    }

    // イベントリスナー
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

    // キーボードショートカット (Alt + H でホームに戻る)
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'h') {
            backHome.click();
        }
    });
});
