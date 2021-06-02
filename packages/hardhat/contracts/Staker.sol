pragma solidity >=0.6.0 <0.9.0;

import "hardhat/console.sol";
import "./ExampleExternalContract.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

contract Staker {

  ExampleExternalContract public exampleExternalContract;

  constructor(address exampleExternalContractAddress) public {
    exampleExternalContract = ExampleExternalContract(exampleExternalContractAddress);
  }

  mapping(address => uint256) public balances;
  uint256 public constant threshold = 10 ether;
  uint256 public deadline = now + 60 days;
  uint256 public balance_t;

  // Collect funds in a payable `stake()` function and track individual `balances` with a mapping:
  //  ( make sure to add a `Stake(address,uint256)` event and emit it for the frontend <List/> display )
  event Stake(address _address, uint256 value);
  event Withdraw(address _address, uint256 value);

  function stake() public payable{
    require(timeLeft() > 0, "Time over.");
    require(!exampleExternalContract.getcompleted(),"Contract already executed.");

    balances[msg.sender] = msg.value + balances[msg.sender];
    balance_t = balance_t + msg.value;
    emit Stake(msg.sender, msg.value);
  }

  // After some `deadline` allow anyone to call an `execute()` function
  //  It should either call `exampleExternalContract.complete{value: address(this).balance}()` to send all the value
  function execute() public {
    require(!exampleExternalContract.getcompleted(),"Contract already executed.");
    require(timeLeft() < 0, "Time is not over.");
    require(balance_t >= threshold,"Threshold min: 10ETH.");

    exampleExternalContract.complete{value: address(this).balance}();
  }


  // if the `threshold` was not met, allow everyone to call a `withdraw()` function
  function withdraw(address payable _address) public {
    require(timeLeft() <= 0, "Time is not over.");
    require(!exampleExternalContract.getcompleted(),"Contract already executed.");
    require(balances[msg.sender] > 0, "You haven't deposited");

    uint256 amount = balances[msg.sender];
    balance_t =- balances[msg.sender];
    balances[msg.sender] = 0;
    _address.transfer(amount);
    
    emit Withdraw(_address, amount);
  }


  // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend
  function timeLeft() public view returns(uint256){
    if(now >= deadline){
      return 0;
    }else{
      return deadline-now;
    }
  }

}
