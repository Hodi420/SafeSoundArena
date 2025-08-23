const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SafeSoundArena', function () {
  let SafeSoundArena, SSAToken, safeSoundArena, ssaToken;
  let owner, player1, player2, feeCollector;
  const betAmount = ethers.utils.parseEther('10');
  const initialSupply = ethers.utils.parseEther('1000000');

  before(async function () {
    [owner, player1, player2, feeCollector] = await ethers.getSigners();

    // Deploy SSAToken
    const SSATokenFactory = await ethers.getContractFactory('SSAToken');
    ssaToken = await SSATokenFactory.deploy();
    await ssaToken.deployed();

    // Deploy SafeSoundArena
    const SafeSoundArenaFactory = await ethers.getContractFactory('SafeSoundArena');
    safeSoundArena = await SafeSoundArenaFactory.deploy(ssaToken.address);
    await safeSoundArena.deployed();

    // Transfer ownership of SSAToken to SafeSoundArena
    await ssaToken.transferOwnership(safeSoundArena.address);

    // Distribute tokens to players
    await ssaToken.transfer(player1.address, initialSupply);
    await ssaToken.transfer(player2.address, initialSupply);

    // Approve SafeSoundArena to spend players' tokens
    await ssaToken.connect(player1).approve(safeSoundArena.address, betAmount.mul(10));
    await ssaToken.connect(player2).approve(safeSoundArena.address, betAmount.mul(10));
  });

  it('should deploy with correct initial values', async function () {
    expect(await ssaToken.name()).to.equal('SafeSoundArena Token');
    expect(await ssaToken.symbol()).to.equal('SSA');
    expect(await safeSoundArena.minBetAmount()).to.equal(ethers.utils.parseEther('1'));
    expect(await safeSoundArena.platformFee()).to.equal(2);
  });

  describe('Game Creation', function () {
    it('should allow creating a new game', async function () {
      await expect(safeSoundArena.connect(player1).createGame(betAmount))
        .to.emit(safeSoundArena, 'GameCreated')
        .withArgs(0, player1.address, betAmount);

      const game = await safeSoundArena.games(0);
      expect(game.players[0]).to.equal(player1.address);
      expect(game.betAmount).to.equal(betAmount);
      expect(game.isActive).to.be.true;
    });

    it('should prevent creating a game with invalid bet amount', async function () {
      const lowBet = ethers.utils.parseEther('0.5');
      await expect(
        safeSoundArena.connect(player1).createGame(lowBet)
      ).to.be.revertedWith('Bet amount too low');
    });
  });

  describe('Game Joining', function () {
    beforeEach(async function () {
      // Create a new game before each test
      await safeSoundArena.connect(player1).createGame(betAmount);
    });

    it('should allow a second player to join', async function () {
      await expect(safeSoundArena.connect(player2).joinGame(0))
        .to.emit(safeSoundArena, 'PlayerJoined')
        .withArgs(0, player2.address);

      const game = await safeSoundArena.games(0);
      expect(game.players[1]).to.equal(player2.address);
    });

    it('should prevent joining a non-existent game', async function () {
      await expect(
        safeSoundArena.connect(player2).joinGame(999)
      ).to.be.reverted;
    });

    it('should prevent joining the same game twice', async function () {
      await safeSoundArena.connect(player2).joinGame(0);
      await expect(
        safeSoundArena.connect(player2).joinGame(0)
      ).to.be.revertedWith('Already joined');
    });
  });

  describe('Game Completion', function () {
    beforeEach(async function () {
      // Create and start a game with two players
      await safeSoundArena.connect(player1).createGame(betAmount);
      await safeSoundArena.connect(player2).joinGame(0);
    });

    it('should allow the owner to end the game', async function () {
      const initialBalance = await ssaToken.balanceOf(player1.address);
      
      // End the game with player1 as the winner
      await expect(safeSoundArena.endGame(0, player1.address))
        .to.emit(safeSoundArena, 'GameEnded')
        .withArgs(0, player1.address, betAmount.mul(2).mul(98).div(100));

      // Check the game state
      const game = await safeSoundArena.games(0);
      expect(game.isActive).to.be.false;
      expect(game.isCompleted).to.be.true;
      expect(game.winner).to.equal(player1.address);

      // Check the winner's balance increased (prize - fee)
      const finalBalance = await ssaToken.balanceOf(player1.address);
      const expectedWinnings = betAmount.mul(2).mul(98).div(100);
      expect(finalBalance.sub(initialBalance)).to.equal(expectedWinnings.sub(betAmount));
    });

    it('should update player stats correctly', async function () {
      // End the game with player1 as the winner
      await safeSoundArena.endGame(0, player1.address);

      // Check player1 stats
      const stats1 = await safeSoundArena.playerStats(player1.address);
      expect(stats1.gamesPlayed).to.equal(1);
      expect(stats1.gamesWon).to.equal(1);
      expect(stats1.totalWinnings).to.be.gt(0);

      // Check player2 stats
      const stats2 = await safeSoundArena.playerStats(player2.address);
      expect(stats2.gamesPlayed).to.equal(1);
      expect(stats2.gamesWon).to.equal(0);
      expect(stats2.totalWinnings).to.equal(0);
    });
  });

  describe('Admin Functions', function () {
    it('should allow owner to update fee collector', async function () {
      await safeSoundArena.setFeeCollector(feeCollector.address);
      expect(await safeSoundArena.feeCollector()).to.equal(feeCollector.address);
    });

    it('should allow owner to update platform fee', async function () {
      await safeSoundArena.setPlatformFee(5); // 5%
      expect(await safeSoundArena.platformFee()).to.equal(5);
    });

    it('should prevent non-owners from calling admin functions', async function () {
      await expect(
        safeSoundArena.connect(player1).setPlatformFee(5)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
