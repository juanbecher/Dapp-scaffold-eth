pragma solidity >=0.6.0 <0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20{
    address public minter;

    event MinterChanged(address indexed from, address to);

    constructor() public payable ERC20("Buy the DEEP", "DEEP"){
        minter = msg.sender;
        mint(msg.sender, 1000 * (10**18));
    }
    function mint(address account, uint256 amount) public payable{
        require(msg.sender==minter,"Error, msg.sender does not have minter role");
        _mint(account, amount);
    }
    function burn(address account, uint256 amount) public{
      _burn(account, amount);

    }
    function transferFromTo(address sender,address recipient, uint256 amount) public {
      // transferFrom(sender, recipient, amount);
      _transfer(sender, recipient, amount);
    }

    function passMinterRole(address dBank) public returns (bool) {
  	require(msg.sender==minter, 'Error, only owner can change pass minter role');
  	minter = dBank;

    emit MinterChanged(msg.sender, dBank);
    return true;
  }
}