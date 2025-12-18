// leaderboard.js - Leaderboard Game
class LeaderboardGame {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Game buttons will be set up when the game is rendered
    }

    render() {
        this.app.mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-6">
                    <h2 class="text-2xl md:text-3xl font-bold text-white mb-3">Leaderboard</h2>
                    <p class="text-gray-400 text-sm">Top 3 richest players</p>
                </div>
                
                <div id="leaderboardContent" class="space-y-4">
                    <div class="text-center py-8">
                        <div class="loading-spinner mx-auto mb-3"></div>
                        <p class="text-gray-400 text-sm">Loading leaderboard...</p>
                    </div>
                </div>
            </div>
        `;
        
        this.loadLeaderboard();
    }

    async loadLeaderboard() {
        try {
            const snapshot = await database.ref('users').orderByChild('balance').limitToLast(100).once('value');
            const users = [];

            snapshot.forEach(child => {
                const user = child.val();
                if (user.username) { // Only include users with usernames
                    users.push({
                        username: user.username,
                        balance: user.balance || 0,
                        userId: user.userId,
                        totalWins: user.totalWins || 0,
                        biggestWin: user.biggestWin || 0
                    });
                }
            });

            // Sort by balance (highest first)
            users.sort((a, b) => b.balance - a.balance);
            
            // Take top 3
            const topPlayers = users.slice(0, 3);
            
            // Find current user's position
            let userPosition = -1;
            let userData = null;
            
            if (this.app.auth.isLoggedIn()) {
                userPosition = users.findIndex(u => u.userId === this.app.auth.getUserId());
                if (userPosition !== -1) {
                    userData = users[userPosition];
                }
            }

            // Display leaderboard
            const leaderboardContent = document.getElementById('leaderboardContent');
            leaderboardContent.innerHTML = '';

            // Add top 3 players with medals
            const medals = ['🥇', '🥈', '🥉'];
            
            topPlayers.forEach((player, index) => {
                const div = document.createElement('div');
                div.className = 'leaderboard-item';
                
                div.innerHTML = `
                    <div class="flex items-center gap-4 w-full">
                        <div class="text-2xl md:text-3xl font-bold w-10 md:w-12">${medals[index]}</div>
                        <div class="flex-1">
                            <div class="text-white font-bold text-base md:text-lg">${player.username}</div>
                            <div class="text-gray-400 text-xs md:text-sm">
                                Wins: ${player.totalWins} | Biggest Win: ${player.biggestWin || 0}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xl md:text-2xl font-bold text-[#10b981]">${player.balance.toLocaleString()} coins</div>
                            <div class="text-gray-400 text-xs mt-1">Balance</div>
                        </div>
                    </div>
                `;
                
                // Highlight current user
                if (player.userId === this.app.auth.getUserId()) {
                    div.style.borderColor = '#8b5cf6';
                    div.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))';
                    div.innerHTML += '<div class="absolute top-2 right-2 text-xs bg-[#8b5cf6] text-white px-2 py-1 rounded-full">YOU</div>';
                }
                
                leaderboardContent.appendChild(div);
            });

            // Show user's position if not in top 3
            if (userPosition !== -1 && userPosition >= 3) {
                const userDiv = document.createElement('div');
                userDiv.className = 'leaderboard-item mt-6';
                userDiv.style.borderColor = '#8b5cf6';
                userDiv.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))';
                
                userDiv.innerHTML = `
                    <div class="flex items-center gap-4 w-full">
                        <div class="text-lg md:text-xl font-bold w-10 md:w-12">#${userPosition + 1}</div>
                        <div class="flex-1">
                            <div class="text-white font-bold text-base md:text-lg flex items-center gap-2">
                                ${userData.username}
                                <span class="text-xs bg-[#8b5cf6] text-white px-2 py-1 rounded-full">YOU</span>
                            </div>
                            <div class="text-gray-400 text-xs md:text-sm">
                                Wins: ${userData.totalWins} | Biggest Win: ${userData.biggestWin || 0}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-lg md:text-xl font-bold text-[#10b981]">${userData.balance.toLocaleString()} coins</div>
                            <div class="text-gray-400 text-xs mt-1">Your Balance</div>
                        </div>
                    </div>
                    <div class="text-center mt-3 text-sm text-gray-400">
                        You are #${userPosition + 1} on the leaderboard
                    </div>
                `;
                
                leaderboardContent.appendChild(userDiv);
            }

            if (users.length === 0) {
                leaderboardContent.innerHTML = '<div class="text-center py-8 text-gray-400">No players yet</div>';
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            const leaderboardContent = document.getElementById('leaderboardContent');
            if (leaderboardContent) {
                leaderboardContent.innerHTML = '<div class="text-center py-8 text-red-400">Error loading leaderboard</div>';
            }
        }
    }

    // Clean up on game exit
    cleanup() {
        // No cleanup needed for leaderboard
    }
}

window.LeaderboardGame = LeaderboardGame;
