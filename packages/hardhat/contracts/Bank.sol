pragma solidity >=0.6.0 <0.9.0;

import "./Token.sol";

contract Bank {
    Token private token;

    mapping(address => uint) public depositStart;
    mapping(address => uint) public etherBalanceOf;
    mapping(address => uint) public depositStart_token;
    mapping(address => uint) public tokenBalanceOf;

    mapping(address => uint) public collateralEther;

    mapping(address => bool) public isDeposited;
    mapping(address => bool) public isDeposited_token;

    mapping(address => bool) public isBorrowed;

    uint256 public constant tokensPerEth = 100;
    uint256 public ETHforSell = 0;

    event Deposit(address indexed user, uint etherAmount, uint timeStart);
    event Withdraw(address indexed user, uint etherAmount, uint depositTime, uint interest);
    event Borrow(address indexed user, uint collateralEtherAmount, uint borrowedTokenAmount);
    event PayOff(address indexed user, uint fee);
    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event SellTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);


    constructor(Token _token) public {
        token = _token;
    }
    // POOL DEPOSIT ETH
    function deposit() payable public {
        require(isDeposited[msg.sender] == false, 'Error, deposit already active');
        require(msg.value>=1e16, 'Error, deposit must be >= 0.01 ETH');

        etherBalanceOf[msg.sender] = etherBalanceOf[msg.sender] + msg.value;
        depositStart[msg.sender] = depositStart[msg.sender] + block.timestamp;

        isDeposited[msg.sender] = true; //activate deposit status
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }
    // POOL DEPOSIT DEEP
    function deposit_token(uint amount) public {
        require(isDeposited_token[msg.sender] == false, 'Error, deposit already active');
        require(amount>=1e16, 'Error, deposit must be >= 0.01 DEEP');

        tokenBalanceOf[msg.sender] = tokenBalanceOf[msg.sender] + amount;
        depositStart_token[msg.sender] = depositStart_token[msg.sender] + block.timestamp;

        isDeposited_token[msg.sender] = true; //activate deposit status
        token.transferFromTo(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount, block.timestamp);
    }

    function withdraw() public {
        require(isDeposited[msg.sender]==true, 'Error, no previous deposit');
        uint userBalance = etherBalanceOf[msg.sender]; //for event

        //check user's hodl time
        uint depositTime = block.timestamp - depositStart[msg.sender];

        //31668017 - interest(10% APY) per second for min. deposit amount (0.01 ETH), cuz:
        //1e15(10% of 0.01 ETH) / 31577600 (seconds in 365.25 days)

        //(etherBalanceOf[msg.sender] / 1e16) - calc. how much higher interest will be (based on deposit), e.g.:
        //for min. deposit (0.01 ETH), (etherBalanceOf[msg.sender] / 1e16) = 1 (the same, 31668017/s)
        //for deposit 0.02 ETH, (etherBalanceOf[msg.sender] / 1e16) = 2 (doubled, (2*31668017)/s)
        uint interestPerSecond = 95004053 * (etherBalanceOf[msg.sender] / 1e16) *100;
        // uint interestPerSecond = (1,3 * etherBalanceOf[msg.sender]) / 31577600;
        uint interest = interestPerSecond * depositTime;

        //reset depositer data
        depositStart[msg.sender] = 0;
        uint amount = etherBalanceOf[msg.sender];
        etherBalanceOf[msg.sender] = 0;
        isDeposited[msg.sender] = false;

        //send funds to user
        msg.sender.transfer(amount); //eth back to user
        token.mint(msg.sender, interest); //interest to user

        

        emit Withdraw(msg.sender, userBalance, depositTime, interest);
    }
    function withdraw_token() public {
        require(isDeposited_token[msg.sender]==true, 'Error, no previous deposit');
        uint userBalance = tokenBalanceOf[msg.sender]; //for event

        //check user's hodl time
        uint depositTime = block.timestamp - depositStart_token[msg.sender];

        //31668017 - interest(10% APY) per second for min. deposit amount (0.01 ETH), cuz:
        //1e15(10% of 0.01 ETH) / 31577600 (seconds in 365.25 days)

        //(etherBalanceOf[msg.sender] / 1e16) - calc. how much higher interest will be (based on deposit), e.g.:
        //for min. deposit (0.01 ETH), (etherBalanceOf[msg.sender] / 1e16) = 1 (the same, 31668017/s)
        //for deposit 0.02 ETH, (etherBalanceOf[msg.sender] / 1e16) = 2 (doubled, (2*31668017)/s)
        uint interestPerSecond = 158340080 * (tokenBalanceOf[msg.sender] / 1e16);
        // uint interestPerSecond = (1,3 * etherBalanceOf[msg.sender]) / 31577600;
        uint interest = interestPerSecond * depositTime;

        //reset depositer data
        depositStart_token[msg.sender] = 0;
        uint amount = tokenBalanceOf[msg.sender];
        tokenBalanceOf[msg.sender] = 0;
        isDeposited_token[msg.sender] = false;

        //send funds to user
        token.transferFromTo(address(this), msg.sender,  amount); //eth back to user
        token.mint(msg.sender, interest); //interest to user

        

        emit Withdraw(msg.sender, userBalance, depositTime, interest);
    }


    function getReward(address stakeHolder) public view returns(uint256){
       //check user's hodl time
        // uint depositTime = block.timestamp - depositStart[msg.sender];
        uint depositTime = block.timestamp - depositStart[stakeHolder];
        //31668017 - interest(10% APY) per second for min. deposit amount (0.01 ETH), cuz:
        //1e15(10% of 0.01 ETH) / 31577600 (seconds in 365.25 days)

        //(etherBalanceOf[msg.sender] / 1e16) - calc. how much higher interest will be (based on deposit), e.g.:
        //for min. deposit (0.01 ETH), (etherBalanceOf[msg.sender] / 1e16) = 1 (the same, 31668017/s)
        //for deposit 0.02 ETH, (etherBalanceOf[msg.sender] / 1e16) = 2 (doubled, (2*31668017)/s)
        uint interestPerSecond = 95004053 * (etherBalanceOf[stakeHolder] / 1e16) * 100;
        // uint interestPerSecond = (1.3 * etherBalanceOf[stakeHolder]) / 31577600;
        uint interest = interestPerSecond * depositTime;
        return interest;
    }
    function getReward_token(address stakeHolder) public view returns(uint256){
       //check user's hodl time
        // uint depositTime = block.timestamp - depositStart[msg.sender];
        uint depositTime = block.timestamp - depositStart_token[stakeHolder];
        //31668017 - interest(10% APY) per second for min. deposit amount (0.01 ETH), cuz:
        //1e15(10% of 0.01 ETH) / 31577600 (seconds in 365.25 days)

        //(etherBalanceOf[msg.sender] / 1e16) - calc. how much higher interest will be (based on deposit), e.g.:
        //for min. deposit (0.01 ETH), (etherBalanceOf[msg.sender] / 1e16) = 1 (the same, 31668017/s)
        //for deposit 0.02 ETH, (etherBalanceOf[msg.sender] / 1e16) = 2 (doubled, (2*31668017)/s)
        uint interestPerSecond = 158340080 * (tokenBalanceOf[stakeHolder] / 1e16);
        // uint interestPerSecond = (1.3 * etherBalanceOf[stakeHolder]) / 31577600;
        uint interest = interestPerSecond * depositTime;
        return interest;
    }

  function buyToken() payable public {
    uint buyAmount_token = msg.value * 100;
    ETHforSell = ETHforSell + msg.value;
    token.mint(msg.sender, buyAmount_token);
    emit BuyTokens(msg.sender, msg.value, buyAmount_token);
  }

  function sellToken(uint amountTokenSell) public {
    
    uint balance = token.balanceOf(msg.sender);
    uint amountEth = amountTokenSell / 100;
    require(amountEth <= ETHforSell,"Contract without ETH to swap");
    require(amountTokenSell <= balance, "Insufficient DEEP");
    ETHforSell = ETHforSell - amountEth;
    token.burn(msg.sender, amountTokenSell);
    msg.sender.transfer(amountEth);
    emit SellTokens(msg.sender, amountEth, amountTokenSell);
  }

  function borrow() payable public {
    require(msg.value>=1e16, 'Error, collateral must be >= 0.01 ETH');
    require(isBorrowed[msg.sender] == false, 'Error, loan already taken');

    //this Ether will be locked till user payOff the loan
    collateralEther[msg.sender] = collateralEther[msg.sender] + msg.value;

    //calc tokens amount to mint, 50% of msg.value
    uint tokensToMint = collateralEther[msg.sender] / 2;

    //mint&send tokens to user
    token.mint(msg.sender, tokensToMint);

    //activate borrower's loan status
    isBorrowed[msg.sender] = true;

    emit Borrow(msg.sender, collateralEther[msg.sender], tokensToMint);
  }

  function payOff() public {
    require(isBorrowed[msg.sender] == true, 'Error, loan not active');
    require(token.transferFrom(msg.sender, address(this), collateralEther[msg.sender]/2), "Error, can't receive tokens"); //must approve dBank 1st

    uint fee = collateralEther[msg.sender]/10; //calc 10% fee

    //send user's collateral minus fee
    msg.sender.transfer(collateralEther[msg.sender]-fee);

    //reset borrower's data
    collateralEther[msg.sender] = 0;
    isBorrowed[msg.sender] = false;

    emit PayOff(msg.sender, fee);
  }
}