// Agora client configuration
let client;
let client2;
let localAudioTrack;
let localVideoTrack;
let remoteAudioTrack;
let remoteVideoTrack;
let isDualStreamEnabled = false;
let isVirtualBackgroundEnabled = false;
let isAinsEnabled = false;
let startTime;
let statsInterval;

// DOM Elements
const appIdInput = document.getElementById('appId');
const tokenInput = document.getElementById('token');
const channelNameInput = document.getElementById('channelName');
const userIdInput = document.getElementById('userId');
const micSelect = document.getElementById('micSelect');
const cameraSelect = document.getElementById('cameraSelect');
const videoProfileSelect = document.getElementById('videoProfile');
const cloudProxySelect = document.getElementById('cloudProxy');
const geoFenceSelect = document.getElementById('geoFence');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const muteMicBtn = document.getElementById('muteMicBtn');
const muteCameraBtn = document.getElementById('muteCameraBtn');
const dualStreamBtn = document.getElementById('dualStreamBtn');
const switchStreamBtn = document.getElementById('switchStreamBtn');
const virtualBgBtn = document.getElementById('virtualBgBtn');
const ainsBtn = document.getElementById('ainsBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localStats = document.getElementById('localStats');
const remoteStats = document.getElementById('remoteStats');
const localNetworkGraph = document.getElementById('localNetworkGraph');
const localFpsGraph = document.getElementById('localFpsGraph');
const remoteNetworkGraph = document.getElementById('remoteNetworkGraph');
const remoteFpsGraph = document.getElementById('remoteFpsGraph');

// Initialize Google Charts
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initializeCharts);

let networkChart;
let fpsChart;
let networkData;
let fpsData;

function initializeCharts() {
    networkData = new google.visualization.DataTable();
    networkData.addColumn('number', 'Time');
    networkData.addColumn('number', 'Upload');
    networkData.addColumn('number', 'Download');

    fpsData = new google.visualization.DataTable();
    fpsData.addColumn('number', 'Time');
    fpsData.addColumn('number', 'Local FPS');
    fpsData.addColumn('number', 'Remote FPS');

    const chartOptions = {
        curveType: 'function',
        legend: { position: 'bottom' },
        backgroundColor: { fill: 'transparent' },
        hAxis: { textPosition: 'none' },
        vAxis: { minValue: 0 },
        animation: {
            duration: 500,
            easing: 'out'
        }
    };

    networkChart = new google.visualization.LineChart(document.getElementById('networkQualityChart'));
    fpsChart = new google.visualization.LineChart(document.getElementById('fpsChart'));

    networkChart.draw(networkData, {
        ...chartOptions,
        title: 'Network Quality',
        vAxis: { title: 'Bitrate (Mbps)' }
    });

    fpsChart.draw(fpsData, {
        ...chartOptions,
        title: 'Frame Rate',
        vAxis: { title: 'FPS' }
    });
}

// Video profiles configuration
const videoProfiles = [
    { label: "360p_1", detail: "640x360, 15fps, 400Kbps", value: "360p_1" },
    { label: "360p_4", detail: "640x360, 30fps, 600Kbps", value: "360p_4" },
    { label: "480p_8", detail: "848×480, 15fps, 610Kbps", value: "480p_8" },
    { label: "480p_9", detail: "848×480, 30fps, 930Kbps", value: "480p_9" },
    { label: "720p_1", detail: "1280×720, 15fps, 1130Kbps", value: "720p_1" },
    { label: "720p_2", detail: "1280×720, 30fps, 2000Kbps", value: "720p_2" },
    { label: "720p_auto", detail: "1280×720, 30fps, 3000Kbps", value: "720p_auto" },
    { label: "1080p_1", detail: "1920×1080, 15fps, 2080Kbps", value: "1080p_1" },
    { label: "1080p_2", detail: "1920×1080, 30fps, 3000Kbps", value: "1080p_2" },
    { label: "1080p_5", detail: "1920×1080, 60fps, 4780Kbps", value: "1080p_5" }
];

// Regions configuration
const regions = [
    { label: "Global", value: "GLOBAL" },
    { label: "Africa", value: "AFRICA" },
    { label: "Asia", value: "ASIA" },
    { label: "China", value: "CHINA" },
    { label: "Europe", value: "EUROPE" },
    { label: "Hong Kong & Macau", value: "HKMC" },
    { label: "India", value: "INDIA" },
    { label: "Japan", value: "JAPAN" },
    { label: "Korea", value: "KOREA" },
    { label: "North America", value: "NORTH_AMERICA" },
    { label: "Oceania", value: "OCEANIA" },
    { label: "Oversea", value: "OVERSEA" },
    { label: "South America", value: "SOUTH_AMERICA" },
    { label: "United States", value: "US" }
];

// Proxy modes configuration
const proxyModes = [
    {
        label: "Close",
        detail: "Disable Cloud Proxy",
        value: "0",
    },
    {
        label: "UDP Mode",
        detail: "Enable Cloud Proxy via UDP protocol",
        value: "3",
    },
    {
        label: "TCP Mode",
        detail: "Enable Cloud Proxy via TCP/TLS port 443",
        value: "5",
    }
];

// Initialize Agora client
async function initializeAgoraClient() {
    client = AgoraRTC.createClient({ mode: "live", codec: "vp9" });
    await client.setClientRole("host");
    
    client2 = AgoraRTC.createClient({ mode: "live", codec: "vp9" });
    await client2.setClientRole("audience");

    setupEventHandlers();
}

// Set up event handlers
function setupEventHandlers() {
    client.on("user-published", async (user, mediaType) => {
        try {
            await client.subscribe(user, mediaType);
            console.log("Subscribed to", mediaType, "from user", user.uid);
            
            if (mediaType === "audio") {
                remoteAudioTrack = user.audioTrack;
                remoteAudioTrack.play();
                console.log("Playing remote audio");
            } else if (mediaType === "video") {
                remoteVideoTrack = user.videoTrack;
                remoteVideo.innerHTML = ''; // Clear no-video div
                remoteVideoTrack.play(remoteVideo);
                console.log("Playing remote video");
            }
        } catch (error) {
            console.error("Error in user-published handler:", error);
        }
    });

    client.on("user-unpublished", async (user, mediaType) => {
        if (mediaType === "audio") {
            remoteAudioTrack = null;
        } else if (mediaType === "video") {
            remoteVideoTrack = null;
            remoteVideo.innerHTML = '<div class="no-video"></div>';
        }
    });

    client2.on("user-published", async (user, mediaType) => {
        try {
            if (user.uid === client.uid) {
                await client2.subscribe(user, mediaType);
                console.log("Client2 subscribed to", mediaType, "from user", user.uid);
                
                if (mediaType === "video" && user.videoTrack) {
                    remoteVideoTrack = user.videoTrack;
                    remoteVideo.innerHTML = ''; // Clear no-video div
                    remoteVideoTrack.play(remoteVideo);
                    console.log("Client2 playing remote video");
                } else if (mediaType === "audio" && user.audioTrack) {
                    remoteAudioTrack = user.audioTrack;
                    remoteAudioTrack.play();
                    console.log("Client2 playing remote audio");
                }
            }
        } catch (error) {
            console.error("Error in client2 user-published handler:", error);
        }
    });

    client2.on("user-unpublished", async (user, mediaType) => {
        if (user.uid === client.uid && mediaType === "video") {
            remoteVideoTrack = null;
            remoteVideo.innerHTML = '<div class="no-video"></div>';
        }
    });
}

// Get devices
async function getDevices() {
    console.log("EMOJI Getting devices");
    try {
        const devices = await AgoraRTC.getDevices();

        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        const videoDevices = devices.filter(device => device.kind === 'videoinput');



        // Populate microphone select
        micSelect.innerHTML = audioDevices.map(device => 
            `<option value="${device.deviceId}">${device.label || `Microphone ${device.deviceId}`}</option>`
        ).join('');

        // Populate camera select
        cameraSelect.innerHTML = videoDevices.map(device => 
            `<option value="${device.deviceId}">${device.label || `Camera ${device.deviceId}`}</option>`
        ).join('');
    } catch (error) {
        console.error("Error getting devices:", error);
    }
}

// Create local tracks
async function createLocalTracks() {
    try {
        [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {
                encoderConfig: "high_quality",
                deviceId: micSelect.value
            },
            {
                encoderConfig: videoProfileSelect.value,
                deviceId: cameraSelect.value
            }
        );

        // Play local video track
        localVideo.innerHTML = ''; // Clear no-video div
        localVideoTrack.play("localVideo");
    } catch (error) {
        console.error("Error creating local tracks:", error);
        throw error;
    }
}

// Join channel
async function joinChannel() {
    try {
        const appId = appIdInput.value;
        const token = tokenInput.value || null;
        const channelName = channelNameInput.value;
        const uid = userIdInput.value ? parseInt(userIdInput.value) : null;

        if (!appId || !channelName) {
            showPopup("Please enter App ID and Channel Name");
            return;
        }

        showPopup("Initializing Agora client...");
        await initializeAgoraClient();
        
        showPopup("Creating local tracks...");
        await createLocalTracks();

        // Set region if selected
        if (geoFenceSelect.value !== "GLOBAL") {
            showPopup(`Setting region to ${geoFenceSelect.value}...`);
            AgoraRTC.setArea({areaCode: geoFenceSelect.value});
        }

        // Set proxy mode if selected
        const proxyMode = parseInt(cloudProxySelect.value);
        if (proxyMode > 0) {
            showPopup(`Starting proxy server in ${proxyMode === 3 ? 'UDP' : 'TCP'} mode...`);
            await client.startProxyServer(proxyMode);
            await client2.startProxyServer(proxyMode);
        }

        // Enable dual stream mode before joining
        showPopup("Enabling dual stream mode...");
        await client.enableDualStream();
        isDualStreamEnabled = true;
        dualStreamBtn.textContent = "Disable Dual Stream";

        // Join channel as host
        showPopup(`Joining channel ${channelName} as host...`);
        await client.join(appId, channelName, token, uid);
        await client.publish([localAudioTrack, localVideoTrack]);

        // Join channel as audience
        showPopup("Joining channel as audience...");
        await client2.join(appId, channelName, token, null);
        
        startTime = Date.now();
        startStatsMonitoring();

        // Update UI
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.5';
        leaveBtn.disabled = false;
        leaveBtn.style.opacity = '1';

        // Enable control buttons
        [muteMicBtn, muteCameraBtn, dualStreamBtn, switchStreamBtn, virtualBgBtn, ainsBtn].forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.background = '#fff3cd';
        });

        // Mute audio after joining
        if (localAudioTrack) {
            await localAudioTrack.setEnabled(false);
            muteMicBtn.textContent = "Unmute Mic";
            showPopup("Audio muted by default");
        }

        updateInviteLink();
        showPopup("Successfully joined channel!");
    } catch (error) {
        console.error("Error joining channel:", error);
        showPopup(`Failed to join channel: ${error.message}`);
    }
}

// Leave channel
async function leaveChannel() {
    try {
        showPopup("Starting leave process...");
        
        // Remove processors before closing tracks
        if (localVideoTrack && isVirtualBackgroundEnabled) {
            showPopup("Removing virtual background processor...");
            try {
                await localVideoTrack.unpipe();
                showPopup("Virtual background processor removed");
            } catch (error) {
                console.error("Error removing virtual background processor:", error);
                showPopup("Error removing virtual background processor");
            }
        }
        if (localAudioTrack && isAinsEnabled) {
            showPopup("Removing AINS processor...");
            try {
                await localAudioTrack.unpipe();
                showPopup("AINS processor removed");
            } catch (error) {
                console.error("Error removing AINS processor:", error);
                showPopup("Error removing AINS processor");
            }
        }

        // Stop proxy server if enabled
        const proxyMode = parseInt(cloudProxySelect.value);
        if (proxyMode > 0) {
            showPopup("Stopping proxy server...");
            try {
                await client.stopProxyServer();
                await client2.stopProxyServer();
                showPopup("Proxy server stopped");
            } catch (error) {
                console.error("Error stopping proxy server:", error);
                showPopup("Error stopping proxy server");
            }
        }

        // Close tracks
        showPopup("Closing tracks...");
        if (localAudioTrack) {
            localAudioTrack.close();
            localAudioTrack = null;
        }
        if (localVideoTrack) {
            localVideoTrack.close();
            localVideoTrack = null;
        }
        if (remoteAudioTrack) {
            remoteAudioTrack.close();
            remoteAudioTrack = null;
        }
        if (remoteVideoTrack) {
            remoteVideoTrack.close();
            remoteVideoTrack = null;
        }
        showPopup("All tracks closed");

        // Clear video containers before leaving
        if (localVideo) {
            localVideo.innerHTML = '<div class="no-video">🐱</div>';
        }
        if (remoteVideo) {
            remoteVideo.innerHTML = '<div class="no-video">🐱</div>';
        }

        // Reset stats
        showPopup("Resetting stats...");
        if (localStats) {
            localStats.innerHTML = '';
        }
        if (remoteStats) {
            remoteStats.innerHTML = '';
        }
        if (networkData) {
            networkData.removeRows(0, networkData.getNumberOfRows());
        }
        if (fpsData) {
            fpsData.removeRows(0, fpsData.getNumberOfRows());
        }
        if (networkChart) {
            networkChart.draw(networkData, {
                title: 'Network Quality',
                vAxis: { title: 'Bitrate (Mbps)' }
            });
        }
        if (fpsChart) {
            fpsChart.draw(fpsData, {
                title: 'Frame Rate',
                vAxis: { title: 'FPS' }
            });
        }

        // Reset overall stats
        if (document.getElementById('overallStats')) {
            document.getElementById('overallStats').innerHTML = '';
        }
        if (document.getElementById('localVideoStats')) {
            document.getElementById('localVideoStats').innerHTML = '';
        }
        if (document.getElementById('remoteVideoStats')) {
            document.getElementById('remoteVideoStats').innerHTML = '';
        }

        // Leave channels
        showPopup("Leaving channels...");
        if (client) {
            await client.leave();
        }
        if (client2) {
            await client2.leave();
        }
        
        stopStatsMonitoring();

        // Update UI
        joinBtn.disabled = false;
        joinBtn.style.opacity = '1';
        leaveBtn.disabled = true;
        leaveBtn.style.opacity = '0.5';

        // Disable control buttons
        [muteMicBtn, muteCameraBtn, dualStreamBtn, switchStreamBtn, virtualBgBtn, ainsBtn].forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });

        showPopup("Successfully left channel!");

    } catch (error) {
        console.error("Error leaving channel:", error);
        showPopup("Failed to leave channel");
    }
}

// Toggle microphone
async function toggleMicrophone() {
    if (localAudioTrack) {
        if (localAudioTrack.enabled) {
            await localAudioTrack.setEnabled(false);
            muteMicBtn.textContent = "Unmute Mic";
        } else {
            await localAudioTrack.setEnabled(true);
            muteMicBtn.textContent = "Mute Mic";
        }
    }
}

// Toggle camera
async function toggleCamera() {
    if (localVideoTrack) {
        if (localVideoTrack.enabled) {
            await localVideoTrack.setEnabled(false);
            muteCameraBtn.textContent = "Unmute Camera";
            localVideo.innerHTML = '<div class="no-video"></div>';
        } else {
            await localVideoTrack.setEnabled(true);
            muteCameraBtn.textContent = "Mute Camera";
            localVideo.innerHTML = '';
            localVideoTrack.play("localVideo");
        }
    }
}

// Toggle dual stream
async function toggleDualStream() {
    if (!client) return;

    try {
        if (!isDualStreamEnabled) {
            await client.enableDualStream();
            isDualStreamEnabled = true;
            dualStreamBtn.textContent = "Disable Dual Stream";
        } else {
            await client.disableDualStream();
            isDualStreamEnabled = false;
            dualStreamBtn.textContent = "Enable Dual Stream";
        }
    } catch (error) {
        console.error("Error toggling dual stream:", error);
    }
}

// Switch stream quality
async function switchStream() {
    if (!client2) return;

    try {
        const remoteUser = client2.remoteUsers.find(user => user.uid === client.uid);
        if (!remoteUser || !remoteUser.videoTrack) return;

        // Toggle between high (0) and low (1) quality
        const currentStreamType = remoteUser.videoTrack._streamType;
        const newStreamType = currentStreamType === 0 ? 1 : 0;
        
        await client2.setRemoteVideoStreamType(remoteUser.uid, newStreamType);
        switchStreamBtn.textContent = `Switch to ${newStreamType === 0 ? "Low" : "High"} Quality`;
    } catch (error) {
        console.error("Error switching stream:", error);
    }
}

// Add popup function
function showPopup(message) {
    // Create container if it doesn't exist
    let container = document.querySelector('.popup-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'popup-container';
        document.body.appendChild(container);
    }

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.textContent = message;
    container.appendChild(popup);
    
    // Remove popup after delay
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            popup.remove();
            // Remove container if empty
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 5000); // Increased from 3000 to 5000ms
}

// Toggle virtual background
async function toggleVirtualBackground() {
    if (!localVideoTrack) {
        console.log("No local video track available");
        showPopup("No video track available");
        return;
    }

    try {
        if (!isVirtualBackgroundEnabled) {
            console.log("Enabling virtual background...");
            showPopup("Enabling virtual background...");
            
            // Create and register virtual background extension
            const vb = new VirtualBackgroundExtension();
            AgoraRTC.registerExtensions([vb]);
            
            // Create processor
            const processor = await vb.createProcessor();
            
            // Set up event handlers
            processor.eventBus.on("PERFORMANCE_WARNING", () => {
                console.warn("Performance warning!!!!!!!!!!!!!!!!!");
                showPopup("VirtualBackground performance warning!");
            });
            processor.eventBus.on("cost", (cost) => {
                console.warn(`cost of vb is ${cost}`);
                showPopup(`VirtualBackground cost: ${cost}`);
            });
            processor.onoverload = async () => {
                console.log("overload!!!");
                showPopup("VirtualBackground overload!");
            };

            // Initialize processor
            try {
                await processor.init("not_needed");
            } catch (error) {
                console.error(error);
                showPopup("Failed to initialize virtual background");
                return;
            }

            // Set options and enable
            processor.setOptions({type: 'blur', blurDegree: 3});
            await processor.enable();
            
            // Pipe the processor
            await localVideoTrack.pipe(processor).pipe(localVideoTrack.processorDestination);
            
            isVirtualBackgroundEnabled = true;
            virtualBgBtn.textContent = "Disable Virtual Background";
            showPopup("VirtualBackground enabled!");
        } else {
            console.log("Disabling virtual background...");
            showPopup("Disabling virtual background...");
            await localVideoTrack.unpipe();
            isVirtualBackgroundEnabled = false;
            virtualBgBtn.textContent = "Enable Virtual Background";
            showPopup("VirtualBackground disabled!");
        }
    } catch (error) {
        console.error("Error toggling virtual background:", error);
        showPopup("Error toggling virtual background");
    }
}

// Toggle AINS
async function toggleAins() {
    if (!localAudioTrack) {
        console.log("No local audio track available");
        showPopup("No audio track available");
        return;
    }

    try {
        if (!isAinsEnabled) {
            console.log("Enabling AINS...");
            showPopup("Enabling AINS...");
            
            // Create and register AINS extension
            const denoiser = new AIDenoiser.AIDenoiserExtension({
                assetsPath: './aiDenoiserExtension/external'
            });
            AgoraRTC.registerExtensions([denoiser]);
            
            denoiser.onloaderror = (e) => {
                console.error(e);
                showPopup("AINS load error");
            };

            // Create processor
            const processor = denoiser.createProcessor();
            
            // Set up event handlers
            processor.onoverload = async (elapsedTimeInMs) => {
                console.log(`"overload!!! elapsed: ${elapsedTimeInMs}`);
                showPopup(`AINS overload after ${elapsedTimeInMs}ms`);
                try {
                    await processor.disable();
                    isAinsEnabled = false;
                    ainsBtn.textContent = "Enable AINS";
                    showPopup("AINS disabled due to overload");
                } catch (error) {
                    console.error("disable AIDenoiser failure");
                    showPopup("Failed to disable AINS after overload");
                }
            };

            // Pipe the processor
            await localAudioTrack.pipe(processor).pipe(localAudioTrack.processorDestination);
            
            // Enable and configure
            try {
                await processor.enable();
                await processor.setLevel("AGGRESSIVE");
                isAinsEnabled = true;
                ainsBtn.textContent = "Disable AINS";
                showPopup("AINS enabled successfully");
            } catch (error) {
                console.error("enable AIDenoiser failure");
                showPopup("Failed to enable AINS");
            }
        } else {
            console.log("Disabling AINS...");
            showPopup("Disabling AINS...");
            await localAudioTrack.unpipe();
            isAinsEnabled = false;
            ainsBtn.textContent = "Enable AINS";
            showPopup("AINS disabled successfully");
        }
    } catch (error) {
        console.error("Error toggling AINS:", error);
        showPopup("Error toggling AINS");
    }
}

// Update invite link
function updateInviteLink() {
    const channelName = channelNameInput.value;
    const inviteLink = `${window.location.origin}?channel=${channelName}`;
    document.getElementById('inviteLink').value = inviteLink;
}

// Copy invite link
function copyInviteLink() {
    const inviteLink = document.getElementById('inviteLink');
    inviteLink.select();
    document.execCommand('copy');
    alert('Invite link copied to clipboard!');
}

// Start stats monitoring
function startStatsMonitoring() {
    statsInterval = setInterval(async () => {
        try {
            const clientStats = await client.getRTCStats();
            const clientStats2 = await client2.getRTCStats();
            const localVideoStats = await client.getLocalVideoStats();
            
            // Get remote stats for the specific user
            let remoteVideoStats = {};
            const remoteUser = client2.remoteUsers.find(user => user.uid === client.uid);
            if (remoteUser) {
                remoteVideoStats = await client2.getRemoteVideoStats()[remoteUser.uid];
            }
            
            updateStats(clientStats, clientStats2, localVideoStats, remoteVideoStats);
        } catch (error) {
            console.error("Error getting stats:", error);
        }
    }, 1000);
}

// Stop stats monitoring
function stopStatsMonitoring() {
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
}

// Update stats display
function updateStats(clientStats, clientStats2, localVideoStats, remoteVideoStats) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Update overall stats
    document.getElementById('overallStats').innerHTML = [
        `Local UID: ${client.uid}`,
        `Host Count: ${clientStats.UserCount}`,
        `Duration: ${duration}s`,
        `RTT: ${clientStats.RTT}ms`,
        `Outgoing B/W: ${(Number(clientStats.OutgoingAvailableBandwidth) * 0.001).toFixed(4)} Mbps`,
        `Link Status: ${navigator.onLine ? "Online" : "Offline"}`
    ].map(stat => `<div class="stat-item">${stat}</div>`).join('');

    // Update local video stats
    document.getElementById('localVideoStats').innerHTML = [
        `Capture FPS: ${localVideoStats.captureFrameRate}`,
        `Send FPS: ${localVideoStats.sendFrameRate}`,
        `Video encode delay: ${Number(localVideoStats.encodeDelay).toFixed(2)}ms`,
        `Resolution: ${localVideoStats.sendResolutionWidth}x${localVideoStats.sendResolutionHeight}`,
        `Send bitrate: ${(Number(localVideoStats.sendBitrate) * 0.000001).toFixed(4)} Mbps`,
        `Send Jitter: ${Number(localVideoStats.sendJitterMs).toFixed(2)}ms`,
        `Send RTT: ${Number(localVideoStats.sendRttMs).toFixed(2)}ms`,
        `Packet Loss: ${Number(localVideoStats.currentPacketLossRate).toFixed(3)}%`,
        `Network Quality: ${clientStats.uplinkNetworkQuality}`
    ].join('<br>');

    if (remoteVideoStats) {
        document.getElementById('remoteVideoStats').innerHTML = [
            `Receive FPS: ${remoteVideoStats.receiveFrameRate}`,
            `Decode FPS: ${remoteVideoStats.decodeFrameRate}`,
            `Render FPS: ${remoteVideoStats.renderFrameRate}`,
            `Resolution: ${remoteVideoStats.receiveResolutionWidth}x${remoteVideoStats.receiveResolutionHeight}`,
            `Receive bitrate: ${(Number(remoteVideoStats.receiveBitrate) * 0.000001).toFixed(4)} Mbps`,
            `Video receive delay: ${Number(remoteVideoStats.receiveDelay).toFixed(0)}ms`,
            `Packets lost: ${remoteVideoStats.receivePacketsLost}`,
            `E2E Delay: ${remoteVideoStats.end2EndDelay}ms`,
            `Transport Delay: ${remoteVideoStats.transportDelay}ms`,
            `Freeze Rate: ${Number(remoteVideoStats.freezeRate).toFixed(3)}%`,
            `Total freeze time: ${remoteVideoStats.totalFreezeTime}s`,
            `Network Quality: ${clientStats.downlinkNetworkQuality}`
        ].join('<br>');
    }

    // Update charts
    const time = (Date.now() - startTime) / 1000;
    
    networkData.addRow([
        time,
        Number(clientStats.SendBitrate) * 0.000001,
        Number(clientStats2.RecvBitrate) * 0.000001
    ]);

    fpsData.addRow([
        time,
        localVideoStats.sendFrameRate,
        remoteVideoStats ? remoteVideoStats.receiveFrameRate : 0
    ]);

    if (networkData.getNumberOfRows() > 60) {
        networkData.removeRow(0);
    }

    if (fpsData.getNumberOfRows() > 60) {
        fpsData.removeRow(0);
    }

    try {
        networkChart.draw(networkData, {
            title: 'Network Quality',
            vAxis: { title: 'Bitrate (Mbps)' }
        });

        fpsChart.draw(fpsData, {
            title: 'Frame Rate',
            vAxis: { title: 'FPS' }
        });
    } catch (error) {
        console.error("Error updating charts:", error);
    }
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set default cat background for video containers
    localVideo.innerHTML = '<div class="no-video"></div>';
    remoteVideo.innerHTML = '<div class="no-video"></div>';

    // Initialize Google Charts
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(initializeCharts);

    // Populate video profiles
    videoProfileSelect.innerHTML = videoProfiles.map(profile => 
        `<option value="${profile.value}" title="${profile.detail}">${profile.label}</option>`
    ).join('');

    // Populate regions
    geoFenceSelect.innerHTML = regions.map(region => 
        `<option value="${region.value}">${region.label}</option>`
    ).join('');

    // Populate proxy modes
    cloudProxySelect.innerHTML = proxyModes.map(mode => 
        `<option value="${mode.value}" title="${mode.detail}">${mode.label}</option>`
    ).join('');

    // Get devices
    getDevices();

    // Add event listeners
    joinBtn.addEventListener('click', joinChannel);
    leaveBtn.addEventListener('click', leaveChannel);
    muteMicBtn.addEventListener('click', toggleMicrophone);
    muteCameraBtn.addEventListener('click', toggleCamera);
    dualStreamBtn.addEventListener('click', toggleDualStream);
    switchStreamBtn.addEventListener('click', switchStream);
    virtualBgBtn.addEventListener('click', toggleVirtualBackground);
    ainsBtn.addEventListener('click', toggleAins);

    // Set initial button states
    leaveBtn.disabled = true;
    leaveBtn.style.opacity = '0.5';
    [muteMicBtn, muteCameraBtn, dualStreamBtn, switchStreamBtn, virtualBgBtn, ainsBtn].forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });

    // Handle window resize for charts
    window.addEventListener('resize', () => {
        if (networkChart && fpsChart) {
            networkChart.draw(networkData, {
                title: 'Network Quality',
                vAxis: { title: 'Bitrate (Mbps)' }
            });
            fpsChart.draw(fpsData, {
                title: 'Frame Rate',
                vAxis: { title: 'FPS' }
            });
        }
    });
}); 