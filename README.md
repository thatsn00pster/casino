# Moon Casino - Crypto Gaming Platform

A feature-rich casino simulation with real-time chat, leaderboards, and multiplayer games.

## Features
- User authentication with email/password
- Real-time chat system
- Leaderboard showing top 3 richest players
- 500 starting coins on signup
- Hourly free coins if balance < 100
- Send money to other players
- Rain system (group prize splitting)
- Crash game with real-time graphics
- Mines game with sound effects
- Blackjack with enhanced animations

## Games
1. **Crash** - Bet on a multiplier that grows until it crashes
2. **Mines** - Reveal gems while avoiding bombs
3. **Blackjack** - Classic 21 against the dealer

## Setup Instructions

1. Clone this repository
2. Open `index.html` in a browser
3. Sign up with email, username, and password
4. Start with 500 coins
5. Claim free coins every hour if balance < 100

## Firebase Configuration

The app uses Firebase Realtime Database for:
- User authentication
- Real-time chat
- Leaderboard data
- Active rain sessions
- Player balances

## Security Notes
- Passwords are base64 encoded (not secure for production)
- Consider implementing proper Firebase Authentication for production
- Balance validation happens client-side (add server validation for production)

## File Structure
