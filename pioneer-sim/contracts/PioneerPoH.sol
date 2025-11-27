// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PioneerPoH {
    address public owner;
    address public relayer;
    mapping(uint256 => bytes32) public roots;
    mapping(uint256 => string) public manifestCids;

    event RootSubmitted(uint256 indexed epoch, bytes32 root, address indexed relayer, string manifestCid);
    event RelayerSet(address indexed relayer);
    event Staked(address indexed staker, uint256 amount);
    event Withdrawn(address indexed staker, uint256 amount);
    event FlagOpened(uint256 indexed disputeId, address indexed reporter, address indexed accused, uint256 deposit, string evidence);
    event DisputeResolved(uint256 indexed disputeId, bool guilty, uint256 slashAmount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "PioneerPoH: caller is not the owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer || msg.sender == owner, "PioneerPoH: caller not relayer");
        _;
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

    function submitRoot(uint256 epoch, bytes32 root, string calldata manifestCid) external onlyRelayer {
        roots[epoch] = root;
        manifestCids[epoch] = manifestCid;
        emit RootSubmitted(epoch, root, msg.sender, manifestCid);
    }

    function getRoot(uint256 epoch) external view returns (bytes32) {
        return roots[epoch];
    }

    function getManifest(uint256 epoch) external view returns (string memory) {
        return manifestCids[epoch];
    }

    // --- staking / dispute mini-protocol ---
    mapping(address => uint256) public stakes;
    enum Status { Unknown, Active, Probation, Suspended }
    mapping(address => Status) public statusOf;

    uint256 public minFlagDeposit = 0.01 ether;

    struct Dispute {
        address reporter;
        address accused;
        string evidence;
        uint256 deposit;
        bool resolved;
        bool guilty;
    }

    uint256 public disputeCount;
    mapping(uint256 => Dispute) public disputes;

    function setMinFlagDeposit(uint256 v) external onlyOwner {
        minFlagDeposit = v;
    }

    function stake() external payable {
        require(msg.value > 0, "stake: zero");
        stakes[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function withdrawStake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "withdraw: insufficient");
        stakes[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function flagUser(uint256 epoch, address accused, string calldata evidence) external payable returns (uint256) {
        require(msg.value >= minFlagDeposit, "flag: deposit too small");
        disputeCount++;
        disputes[disputeCount] = Dispute({
            reporter: msg.sender,
            accused: accused,
            evidence: evidence,
            deposit: msg.value,
            resolved: false,
            guilty: false
        });
        emit FlagOpened(disputeCount, msg.sender, accused, msg.value, evidence);
        // place accused in probation until resolution
        statusOf[accused] = Status.Probation;
        return disputeCount;
    }

    // Simple owner-resolved dispute for prototype. In production, this should be a DAO or juried flow.
    function resolveDispute(uint256 disputeId, bool guilty, uint256 slashAmount) external onlyOwner {
        Dispute storage d = disputes[disputeId];
        require(!d.resolved, "already resolved");
        d.resolved = true;
        d.guilty = guilty;
        if (guilty) {
            // slash accused stake up to slashAmount
            uint256 toSlash = slashAmount;
            uint256 avail = stakes[d.accused];
            if (avail < toSlash) toSlash = avail;
            if (toSlash > 0) {
                stakes[d.accused] -= toSlash;
                // transfer slash to reporter as bounty
                payable(d.reporter).transfer(toSlash + d.deposit);
            } else {
                // return deposit to reporter if no slashing possible
                payable(d.reporter).transfer(d.deposit);
            }
            statusOf[d.accused] = Status.Suspended;
        } else {
            // return deposit to reporter
            payable(d.reporter).transfer(d.deposit);
            // clear probation
            statusOf[d.accused] = Status.Active;
        }
        emit DisputeResolved(disputeId, guilty, slashAmount);
    }
}
