// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SafeSoundArena
 * @dev Main contract for the SafeSoundArena game platform
 */
contract SafeSoundArena is Ownable, ReentrancyGuard {
    // Token contract
    IERC20 public ssaToken;
    
    // Game structure
    struct Game {
        address[] players;
        uint256 betAmount;
        uint256 startTime;
        uint256 endTime;
        address winner;
        bool isActive;
        bool isCompleted;
        mapping(address => bool) hasJoined;
    }
    
    // Player stats
    struct PlayerStats {
        uint256 gamesPlayed;
        uint256 gamesWon;
        uint256 totalWinnings;
        uint256 lastPlayed;
    }
    
    // Game events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 betAmount);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameStarted(uint256 indexed gameId);
    event GameEnded(uint256 indexed gameId, address indexed winner, uint256 prize);
    event RewardDistributed(address indexed player, uint256 amount);
    
    // Game ID counter
    uint256 public gameCounter;
    
    // Mappings
    mapping(uint256 => Game) public games;
    mapping(address => PlayerStats) public playerStats;
    
    // Game settings
    uint256 public minBetAmount = 1 * 10**18; // 1 SSA token
    uint256 public maxBetAmount = 1000 * 10**18; // 1000 SSA tokens
    uint256 public gameDuration = 1 hours;
    uint256 public platformFee = 2; // 2% fee
    
    // Platform fee collector
    address public feeCollector;
    
    // Modifiers
    modifier onlyActiveGame(uint256 _gameId) {
        require(games[_gameId].isActive, "Game is not active");
        _;
    }
    
    modifier onlyGamePlayer(uint256 _gameId) {
        require(games[_gameId].hasJoined[msg.sender], "Not a game participant");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _ssaToken Address of the SSA token contract
     */
    constructor(address _ssaToken) {
        require(_ssaToken != address(0), "Invalid token address");
        ssaToken = IERC20(_ssaToken);
        feeCollector = msg.sender;
    }
    
    /**
     * @dev Create a new game
     * @param _betAmount Amount of tokens to bet
     */
    function createGame(uint256 _betAmount) external {
        require(_betAmount >= minBetAmount, "Bet amount too low");
        require(_betAmount <= maxBetAmount, "Bet amount too high");
        
        // Transfer tokens to the contract
        require(
            ssaToken.transferFrom(msg.sender, address(this), _betAmount),
            "Token transfer failed"
        );
        
        // Create new game
        uint256 gameId = gameCounter++;
        Game storage game = games[gameId];
        
        game.players.push(msg.sender);
        game.betAmount = _betAmount;
        game.startTime = block.timestamp;
        game.isActive = true;
        game.hasJoined[msg.sender] = true;
        
        emit GameCreated(gameId, msg.sender, _betAmount);
    }
    
    /**
     * @dev Join an existing game
     * @param _gameId ID of the game to join
     */
    function joinGame(uint256 _gameId) external onlyActiveGame(_gameId) {
        Game storage game = games[_gameId];
        require(!game.hasJoined[msg.sender], "Already joined");
        require(game.players.length < 2, "Game is full");
        
        // Transfer tokens to the contract
        require(
            ssaToken.transferFrom(msg.sender, address(this), game.betAmount),
            "Token transfer failed"
        );
        
        // Add player to the game
        game.players.push(msg.sender);
        game.hasJoined[msg.sender] = true;
        
        emit PlayerJoined(_gameId, msg.sender);
        
        // Start the game if two players have joined
        if (game.players.length == 2) {
            game.startTime = block.timestamp;
            emit GameStarted(_gameId);
        }
    }
    
    /**
     * @dev End the game and distribute rewards
     * @param _gameId ID of the game to end
     * @param _winner Address of the winner
     */
    function endGame(uint256 _gameId, address _winner) 
        external 
        onlyOwner 
        onlyActiveGame(_gameId) 
    {
        Game storage game = games[_gameId];
        require(game.players.length == 2, "Not enough players");
        require(game.players[0] == _winner || game.players[1] == _winner, "Invalid winner");
        
        // Mark game as completed
        game.isActive = false;
        game.isCompleted = true;
        game.winner = _winner;
        game.endTime = block.timestamp;
        
        // Calculate prize amount (total bet amount minus fee)
        uint256 totalPrize = game.betAmount * 2;
        uint256 feeAmount = (totalPrize * platformFee) / 100;
        uint256 winnerPrize = totalPrize - feeAmount;
        
        // Transfer fee to collector
        if (feeAmount > 0) {
            require(
                ssaToken.transfer(feeCollector, feeAmount),
                "Fee transfer failed"
            );
        }
        
        // Transfer prize to winner
        require(
            ssaToken.transfer(_winner, winnerPrize),
            "Prize transfer failed"
        );
        
        // Update player stats
        _updatePlayerStats(_winner, true, winnerPrize);
        _updatePlayerStats(
            _winner == game.players[0] ? game.players[1] : game.players[0],
            false,
            0
        );
        
        emit GameEnded(_gameId, _winner, winnerPrize);
    }
    
    /**
     * @dev Update player statistics
     * @param _player Address of the player
     * @param _won Whether the player won the game
     * @param _winnings Amount of tokens won
     */
    function _updatePlayerStats(
        address _player,
        bool _won,
        uint256 _winnings
    ) internal {
        PlayerStats storage stats = playerStats[_player];
        
        stats.gamesPlayed++;
        
        if (_won) {
            stats.gamesWon++;
            stats.totalWinnings += _winnings;
        }
        
        stats.lastPlayed = block.timestamp;
    }
    
    /**
     * @dev Get player statistics
     * @param _player Address of the player
     */
    function getPlayerStats(address _player) 
        external 
        view 
        returns (
            uint256 gamesPlayed,
            uint256 gamesWon,
            uint256 totalWinnings,
            uint256 lastPlayed
        ) 
    {
        PlayerStats storage stats = playerStats[_player];
        return (
            stats.gamesPlayed,
            stats.gamesWon,
            stats.totalWinnings,
            stats.lastPlayed
        );
    }
    
    /**
     * @dev Set the platform fee collector address
     * @param _feeCollector Address of the fee collector
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Set the platform fee percentage
     * @param _fee New fee percentage (0-100)
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 10, "Fee too high"); // Max 10%
        platformFee = _fee;
    }
    
    /**
     * @dev Set the minimum and maximum bet amounts
     * @param _minBet Minimum bet amount in wei
     * @param _maxBet Maximum bet amount in wei
     */
    function setBetLimits(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        require(_minBet > 0, "Invalid min bet");
        require(_maxBet > _minBet, "Max bet must be greater than min bet");
        
        minBetAmount = _minBet;
        maxBetAmount = _maxBet;
    }
    
    /**
     * @dev Emergency function to recover ERC20 tokens
     * @param _tokenAddress Address of the token contract
     * @param _to Address to send tokens to
     * @param _amount Amount of tokens to recover
     */
    function recoverERC20(
        address _tokenAddress,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        require(_to != address(0), "Invalid address");
        require(_amount > 0, "Amount must be greater than zero");
        
        IERC20 token = IERC20(_tokenAddress);
        require(token.transfer(_to, _amount), "Token transfer failed");
    }
}
