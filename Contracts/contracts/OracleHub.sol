pragma solidity ^0.4.19;

import './oraclizeAPI_05.sol';
import './Database.sol';

// TODO: Deploy usingOraclize as a seperate contract so we can update OracleHub independantly
// TODO: Move gas returns to TokenBurn + Fund by referencing queryID in those functions. 
contract OracleHub is usingOraclize{ 

  Database public database; 


  function OracleHub(address _database)
  public {
    database = Database(_database); 
    // OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475); only for localhost
  }

  // TODO: get price of call
  // Asks oraclize what the current price of Ether is 
  function fundQuery()
  external 
  payable
  returns (bool) { 
    bytes32 queryID = oraclize_query('URL', 'json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd}');
    database.setAddress(queryID, msg.sender);
    database.setUint(keccak256("assetFundingPriceTimestamp", msg.sender), block.timestamp);
    database.setBool(queryID, true);
    LogFundingQuerySent(msg.sender, block.timestamp, queryID);
  }

  // TODO: set requirement for how much ether is needed in this call
  function burnQuery(uint _accessLevelDesired)
  external
  basicVerification(_accessLevelDesired)
  payable
  returns(bool){
    bytes32 queryID = oraclize_query('nested', '[WolframAlpha]  10 to the power of 8 multiplied by ${[URL] json(https://api.coinmarketcap.com/v1/ticker/mybit-token/).0.price_usd}');
    database.setAddress(queryID, msg.sender);
    database.setUint(queryID, _accessLevelDesired);
    database.setBool(queryID, true);
    LogBurnQuerySent(msg.sender, _accessLevelDesired, queryID);
    return true;
  }

  function __callback(bytes32 myid, string result)
  public
  isOraclize {
    if (database.boolStorage(myid)) { 
      fundingCallback(myid, result);
    }
    else { 
      burnCallback(myid, result); 
    }
  }

  function fundingCallback(bytes32 myid, string result)
  internal { 
    address sender = database.addressStorage(myid);
    uint timestamp = database.uintStorage(keccak256("assetFundingPriceTimestamp", sender));
    database.setUint(keccak256("assetFundingPrice", sender, timestamp), parseInt(result)); 
    database.deleteAddress(myid); 
    database.deleteBool(myid); 
    LogFundingCallbackReceived(myid, sender, timestamp); 
  }

  function burnCallback(bytes32 myid, string result)
  internal { 
    uint accessLevelDesired = database.uintStorage(myid);
    address sender = database.addressStorage(myid);
    database.setUint(keccak256("accessTokenFee", sender, accessLevelDesired), parseInt(result));
    database.deleteAddress(myid);
    database.deleteUint(myid);
    database.deleteBool(myid);
    LogBurnCallbackReceived(myid, sender, parseInt(result));
  }

  modifier isOraclize() {
   require(msg.sender == oraclize_cbAddress());
   _;
  }

  modifier basicVerification(uint _newAccessLevel) {
  uint currentLevel = database.uintStorage(keccak256("userAccess", msg.sender));
  require(_newAccessLevel >= 2);
  require(_newAccessLevel <= 4);
  require(_newAccessLevel > currentLevel);
  _;
  }

  event LogBurnQuerySent( address _from, uint256 _accessLevelDesired, bytes32 _queryID);
  event LogFundingQuerySent(address _funder, uint value, bytes32 _queryID);
  event LogBurnCallbackReceived(bytes32 _queryID, address _sender, uint _numberOfTokens);
  event LogFundingCallbackReceived(bytes32 queryID, address _sender, uint _timestamp); 
}
