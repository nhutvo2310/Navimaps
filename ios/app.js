const PRIVATE_RELEASES_API = "https://api.github.com/repos/nhutvo2310/Navimaps-iOS/releases";
const PUBLIC_RELEASES_API = "https://api.github.com/repos/nhutvo2310/Navimaps/releases";
const PUBLIC_RELEASES_PAGE = "https://github.com/nhutvo2310/Navimaps/releases";
const SIDEINSTALLER_OPEN = "https://sideinstaller.net/open.html?url=";
const IOS_TAG_PATTERN = /^ios-v(\d+)\.(\d+)\.(\d+)$/;
const IPA_ASSET_NAME = "Navimaps.ipa";
const CACHE_KEY = "navimaps-ios-latest-release-v1";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_PAGES = 10;

const releaseVersion = document.getElementById("releaseVersion");
const releaseStatus = document.getElementById("releaseStatus");
const releaseSource = document.getElementById("releaseSource");
const statusDot = document.getElementById("statusDot");
const installButton = document.getElementById("installButton");
const downloadButton = document.getElementById("downloadButton");
const retryButton = document.getElementById("retryButton");
const privateRepoNotice = document.getElementById("privateRepoNotice");

function compareVersions(a, b) {
    for (let index = 0; index < 3; index += 1) {
        if (a.versionParts[index] !== b.versionParts[index]) {
            return b.versionParts[index] - a.versionParts[index];
        }
    }

    return new Date(b.release.published_at || b.release.created_at || 0).getTime()
        - new Date(a.release.published_at || a.release.created_at || 0).getTime();
}

function getCandidate(release) {
    if (!release || release.draft || release.prerelease || typeof release.tag_name !== "string") {
        return null;
    }

    const match = IOS_TAG_PATTERN.exec(release.tag_name);
    if (!match) {
        return null;
    }

    const asset = (release.assets || []).find(item => item && item.name === IPA_ASSET_NAME && item.browser_download_url);
    if (!asset) {
        return null;
    }

    return {
        release,
        asset,
        version: `${match[1]}.${match[2]}.${match[3]}`,
        versionParts: [Number(match[1]), Number(match[2]), Number(match[3])]
    };
}

async function fetchReleasePages(apiUrl) {
    const candidates = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await fetch(`${apiUrl}?per_page=100&page=${page}`, {
            headers: { Accept: "application/vnd.github+json" },
            cache: "no-store"
        });

        if (!response.ok) {
            const error = new Error(`GitHub API ${response.status}`);
            error.status = response.status;
            throw error;
        }

        const releases = await response.json();
        if (!Array.isArray(releases)) {
            throw new Error("GitHub API returned an unexpected response");
        }

        for (const release of releases) {
            const candidate = getCandidate(release);
            if (candidate) {
                candidates.push(candidate);
            }
        }

        if (releases.length < 100) {
            break;
        }
    }

    candidates.sort(compareVersions);
    return candidates[0] || null;
}

function readCachedRelease() {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return cached;
    } catch {
        return null;
    }
}

function saveCachedRelease(candidate) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            version: candidate.version,
            downloadUrl: candidate.asset.browser_download_url,
            tag: candidate.release.tag_name
        }));
    } catch {
        // Safari private browsing can reject localStorage writes. The page works without caching.
    }
}

function setButtonLink(element, href) {
    element.href = href;
    element.classList.remove("disabled");
    element.setAttribute("aria-disabled", "false");
}

function showReady(version, downloadUrl, sourceText, tag) {
    const sideInstallerUrl = `${SIDEINSTALLER_OPEN}${encodeURIComponent(downloadUrl)}`;
    releaseVersion.textContent = `v${version}`;
    releaseStatus.textContent = "IPA sẵn sàng để tải và ký lại trên iPhone.";
    releaseSource.textContent = `${sourceText} · ${tag}`;
    statusDot.classList.remove("error");
    statusDot.classList.add("ready");
    setButtonLink(downloadButton, downloadUrl);
    setButtonLink(installButton, sideInstallerUrl);
}

function showUnavailable(message) {
    releaseVersion.textContent = "Chưa có IPA công khai";
    releaseStatus.textContent = message;
    releaseSource.innerHTML = `Xem release tại <a href="${PUBLIC_RELEASES_PAGE}" target="_blank" rel="noopener noreferrer">GitHub</a>.`;
    statusDot.classList.remove("ready");
    statusDot.classList.add("error");
}

async function loadLatestRelease({ ignoreCache = false } = {}) {
    retryButton.disabled = true;
    releaseVersion.textContent = "Đang kiểm tra…";
    releaseStatus.textContent = "Đang tìm bản phát hành iOS hợp lệ.";
    releaseSource.textContent = "";
    statusDot.classList.remove("ready", "error");

    if (!ignoreCache) {
        const cached = readCachedRelease();
        if (cached) {
            showReady(cached.version, cached.downloadUrl, "Bản phát hành công khai đã lưu tạm", cached.tag);
        }
    }

    let privateRepoUnavailable = false;

    try {
        const privateCandidate = await fetchReleasePages(PRIVATE_RELEASES_API);
        if (privateCandidate) {
            saveCachedRelease(privateCandidate);
            showReady(
                privateCandidate.version,
                privateCandidate.asset.browser_download_url,
                "Release từ Navimaps-iOS",
                privateCandidate.release.tag_name
            );
            privateRepoNotice.hidden = true;
            return;
        }
    } catch (error) {
        privateRepoUnavailable = error.status === 404 || error.status === 403;
    }

    privateRepoNotice.hidden = !privateRepoUnavailable;

    try {
        const publicCandidate = await fetchReleasePages(PUBLIC_RELEASES_API);
        if (publicCandidate) {
            saveCachedRelease(publicCandidate);
            showReady(
                publicCandidate.version,
                publicCandidate.asset.browser_download_url,
                "Public mirror từ Navimaps",
                publicCandidate.release.tag_name
            );
            return;
        }

        showUnavailable("Chưa tìm thấy release ios-vX.Y.Z có asset Navimaps.ipa.");
    } catch {
        const cached = readCachedRelease();
        if (cached) {
            showReady(cached.version, cached.downloadUrl, "Dữ liệu lưu tạm vì GitHub API đang lỗi", cached.tag);
            return;
        }
        showUnavailable("Không đọc được GitHub Releases. Có thể API đang giới hạn, mạng lỗi hoặc IPA chưa được mirror công khai.");
    } finally {
        retryButton.disabled = false;
    }
}

retryButton.addEventListener("click", () => {
    localStorage.removeItem(CACHE_KEY);
    loadLatestRelease({ ignoreCache: true });
});

loadLatestRelease();
