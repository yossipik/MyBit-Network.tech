"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var DToken = exports.DToken = 
{
  "contractName": "DToken",
  "abi": [
    {
      "constant": false,
      "inputs": [],
      "name": "withdraw",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "getAmountOwed",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_tokenHolder",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "name": "success",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "getERC20",
      "outputs": [
        {
          "name": "",
          "type": "address"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "bytecode": "0x",
  "deployedBytecode": "0x",
  "sourceMap": "",
  "deployedSourceMap": "",
  "source": "pragma solidity 0.4.24;\n\nimport \"../interfaces/ERC20.sol\";\nimport \"../interfaces/DBInterface.sol\";\nimport \"../math/SafeMath.sol\";\n\ninterface DToken {\n  function withdraw() external returns (bool);\n  function getAmountOwed(address _user) external view returns (uint);\n  function balanceOf(address _tokenHolder) external view returns (uint);\n  function transfer(address _to, uint _amount) external returns (bool success);\n  function getERC20() external  view returns (address);\n}\n\n// @title A dividend-token holding contract that locks tokens and retrieves dividends for assetManagers\n// @notice This contract receives newly minted tokens and retrieves Ether or ERC20 tokens received from the asset\n// @dev Tokens\ncontract AssetManagerFunds {\n  using SafeMath for uint256;\n\n  DBInterface public database;\n\n  constructor(address _database)\n  public {\n    database = DBInterface(_database);\n  }\n\n  function withdraw(bytes32 _assetID)\n  external\n  returns (bool) {\n    require(msg.sender == database.addressStorage(keccak256(abi.encodePacked(\"assetManager\", _assetID))));\n    DToken token = DToken(database.addressStorage(keccak256(abi.encodePacked(\"tokenAddress\", _assetID))));\n    require(address(token) != address(0));\n    uint amountOwed;\n    uint balanceBefore;\n    if (token.getERC20() == address(0)){\n      balanceBefore = address(this).balance;\n      amountOwed = token.getAmountOwed(address(this));\n      require(amountOwed > 0);\n      uint balanceAfter = balanceBefore.add(amountOwed);\n      require(token.withdraw());\n      require(address(this).balance == balanceAfter);\n      msg.sender.transfer(amountOwed);\n    }\n    else {\n      amountOwed = token.getAmountOwed(address(this));\n      require(amountOwed > 0);\n      balanceBefore = token.balanceOf(address(this));\n      require(token.withdraw());\n      require(token.balanceOf(address(this)).sub(amountOwed) == balanceBefore);\n      token.transfer(msg.sender, amountOwed);\n    }\n    return true;\n  }\n\n  function retrieveAssetManagerTokens(bytes32[] _assetID)\n  external\n  returns (bool) {\n    require(_assetID.length < 50);\n    uint[] memory payoutAmounts = new uint[](_assetID.length);\n    address[] memory tokenAddresses = new address[](_assetID.length);\n    uint8 numEntries;\n    for(uint8 i = 0; i < _assetID.length; i++){\n      require(msg.sender == database.addressStorage(keccak256(abi.encodePacked(\"assetManager\", _assetID[i]))) );\n      DToken token = DToken(database.addressStorage(keccak256(abi.encodePacked(\"tokenAddress\", _assetID[i]))));\n      require(address(token) != address(0));\n      uint tokensOwed = token.getAmountOwed(address(this));\n      require(tokensOwed > 0);\n      DToken fundingToken = DToken(token.getERC20());\n      uint balanceBefore = fundingToken.balanceOf(address(this));\n      uint8 tokenIndex = containsAddress(tokenAddresses, address(token));\n      if (tokenIndex < _assetID.length) {  payoutAmounts[tokenIndex] = payoutAmounts[tokenIndex].add(tokensOwed); }\n      else {\n        tokenAddresses[numEntries] = address(fundingToken);\n        payoutAmounts[numEntries] = tokensOwed;\n        numEntries++;\n      }\n      require(token.withdraw());\n      require(fundingToken.balanceOf(address(this)).sub(tokensOwed) == balanceBefore);\n    }\n\n    for(i = 0; i < numEntries; i++){\n      require(ERC20(tokenAddresses[i]).transfer(msg.sender, payoutAmounts[i]));\n    }\n    return true;\n  }\n\n\n  function retrieveAssetManagerETH(bytes32[] _assetID)\n  external\n  returns (bool) {\n    require(_assetID.length < 50);\n    uint weiOwed;\n    for(uint8 i = 0; i < _assetID.length; i++){\n      require(msg.sender == database.addressStorage(keccak256(abi.encodePacked(\"assetManager\", _assetID[i]))));\n      DToken token = DToken(database.addressStorage(keccak256(abi.encodePacked(\"tokenAddress\", _assetID[i]))));\n      uint balanceBefore = address(this).balance;\n      uint amountOwed = token.getAmountOwed(address(this));\n      require(amountOwed > 0);\n      uint balanceAfter = balanceBefore.add(amountOwed);\n      require(token.withdraw());\n      require(address(this).balance == balanceAfter);\n      weiOwed = weiOwed.add(amountOwed);\n    }\n    msg.sender.transfer(weiOwed);\n    return true;\n  }\n\n  function containsAddress(address[] _addressList, address _addr)\n  internal\n  pure\n  returns (uint8) {\n    for (uint8 i = 0; i < _addressList.length; i++){\n      if (_addressList[i] == _addr) return i;\n    }\n    return uint8(_addressList.length + 1);\n  }\n\n  function ()\n  payable\n  public {}\n\n}\n",
  "sourcePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/roles/AssetManagerFunds.sol",
  "ast": {
    "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/roles/AssetManagerFunds.sol",
    "exportedSymbols": {
      "AssetManagerFunds": [
        9607
      ],
      "DToken": [
        9023
      ]
    },
    "id": 9608,
    "nodeType": "SourceUnit",
    "nodes": [
      {
        "id": 8986,
        "literals": [
          "solidity",
          "0.4",
          ".24"
        ],
        "nodeType": "PragmaDirective",
        "src": "0:23:36"
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/ERC20.sol",
        "file": "../interfaces/ERC20.sol",
        "id": 8987,
        "nodeType": "ImportDirective",
        "scope": 9608,
        "sourceUnit": 6698,
        "src": "25:33:36",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/DBInterface.sol",
        "file": "../interfaces/DBInterface.sol",
        "id": 8988,
        "nodeType": "ImportDirective",
        "scope": 9608,
        "sourceUnit": 6502,
        "src": "59:39:36",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/math/SafeMath.sol",
        "file": "../math/SafeMath.sol",
        "id": 8989,
        "nodeType": "ImportDirective",
        "scope": 9608,
        "sourceUnit": 6934,
        "src": "99:30:36",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 9023,
        "linearizedBaseContracts": [
          9023
        ],
        "name": "DToken",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 8994,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "withdraw",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 8990,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "169:2:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 8993,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 8992,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 8994,
                  "src": "190:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 8991,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "190:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "189:6:36"
            },
            "scope": 9023,
            "src": "152:44:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9001,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "getAmountOwed",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 8997,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 8996,
                  "name": "_user",
                  "nodeType": "VariableDeclaration",
                  "scope": 9001,
                  "src": "222:13:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 8995,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "222:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "221:15:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9000,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 8999,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9001,
                  "src": "260:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 8998,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "260:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "259:6:36"
            },
            "scope": 9023,
            "src": "199:67:36",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9008,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "balanceOf",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9004,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9003,
                  "name": "_tokenHolder",
                  "nodeType": "VariableDeclaration",
                  "scope": 9008,
                  "src": "288:20:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9002,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "288:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "287:22:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9007,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9006,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9008,
                  "src": "333:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 9005,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "333:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "332:6:36"
            },
            "scope": 9023,
            "src": "269:70:36",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9017,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "transfer",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9013,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9010,
                  "name": "_to",
                  "nodeType": "VariableDeclaration",
                  "scope": 9017,
                  "src": "360:11:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9009,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "360:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 9012,
                  "name": "_amount",
                  "nodeType": "VariableDeclaration",
                  "scope": 9017,
                  "src": "373:12:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 9011,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "373:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "359:27:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9016,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9015,
                  "name": "success",
                  "nodeType": "VariableDeclaration",
                  "scope": 9017,
                  "src": "405:12:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9014,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "405:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "404:14:36"
            },
            "scope": 9023,
            "src": "342:77:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9022,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "getERC20",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9018,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "439:2:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9021,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9020,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9022,
                  "src": "466:7:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9019,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "466:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "465:9:36"
            },
            "scope": 9023,
            "src": "422:53:36",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 9608,
        "src": "131:346:36"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "contract",
        "documentation": null,
        "fullyImplemented": true,
        "id": 9607,
        "linearizedBaseContracts": [
          9607
        ],
        "name": "AssetManagerFunds",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "id": 9026,
            "libraryName": {
              "contractScope": null,
              "id": 9024,
              "name": "SafeMath",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6933,
              "src": "749:8:36",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_SafeMath_$6933",
                "typeString": "library SafeMath"
              }
            },
            "nodeType": "UsingForDirective",
            "src": "743:27:36",
            "typeName": {
              "id": 9025,
              "name": "uint256",
              "nodeType": "ElementaryTypeName",
              "src": "762:7:36",
              "typeDescriptions": {
                "typeIdentifier": "t_uint256",
                "typeString": "uint256"
              }
            }
          },
          {
            "constant": false,
            "id": 9028,
            "name": "database",
            "nodeType": "VariableDeclaration",
            "scope": 9607,
            "src": "774:27:36",
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_contract$_DBInterface_$6501",
              "typeString": "contract DBInterface"
            },
            "typeName": {
              "contractScope": null,
              "id": 9027,
              "name": "DBInterface",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6501,
              "src": "774:11:36",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_DBInterface_$6501",
                "typeString": "contract DBInterface"
              }
            },
            "value": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 9039,
              "nodeType": "Block",
              "src": "846:44:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "id": 9037,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftHandSide": {
                      "argumentTypes": null,
                      "id": 9033,
                      "name": "database",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9028,
                      "src": "852:8:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DBInterface_$6501",
                        "typeString": "contract DBInterface"
                      }
                    },
                    "nodeType": "Assignment",
                    "operator": "=",
                    "rightHandSide": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "id": 9035,
                          "name": "_database",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9030,
                          "src": "875:9:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        ],
                        "id": 9034,
                        "name": "DBInterface",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6501,
                        "src": "863:11:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_type$_t_contract$_DBInterface_$6501_$",
                          "typeString": "type(contract DBInterface)"
                        }
                      },
                      "id": 9036,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "typeConversion",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "863:22:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DBInterface_$6501",
                        "typeString": "contract DBInterface"
                      }
                    },
                    "src": "852:33:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_DBInterface_$6501",
                      "typeString": "contract DBInterface"
                    }
                  },
                  "id": 9038,
                  "nodeType": "ExpressionStatement",
                  "src": "852:33:36"
                }
              ]
            },
            "documentation": null,
            "id": 9040,
            "implemented": true,
            "isConstructor": true,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9031,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9030,
                  "name": "_database",
                  "nodeType": "VariableDeclaration",
                  "scope": 9040,
                  "src": "818:17:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9029,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "818:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "817:19:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9032,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "846:0:36"
            },
            "scope": 9607,
            "src": "806:84:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 9210,
              "nodeType": "Block",
              "src": "958:1001:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "id": 9060,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9048,
                            "name": "msg",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13268,
                            "src": "972:3:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_message",
                              "typeString": "msg"
                            }
                          },
                          "id": 9049,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "sender",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "972:10:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "==",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "hexValue": "61737365744d616e61676572",
                                      "id": 9055,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": true,
                                      "kind": "string",
                                      "lValueRequested": false,
                                      "nodeType": "Literal",
                                      "src": "1037:14:36",
                                      "subdenomination": null,
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                        "typeString": "literal_string \"assetManager\""
                                      },
                                      "value": "assetManager"
                                    },
                                    {
                                      "argumentTypes": null,
                                      "id": 9056,
                                      "name": "_assetID",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 9042,
                                      "src": "1053:8:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                        "typeString": "literal_string \"assetManager\""
                                      },
                                      {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": null,
                                      "id": 9053,
                                      "name": "abi",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13255,
                                      "src": "1020:3:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_magic_abi",
                                        "typeString": "abi"
                                      }
                                    },
                                    "id": 9054,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "memberName": "encodePacked",
                                    "nodeType": "MemberAccess",
                                    "referencedDeclaration": null,
                                    "src": "1020:16:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                      "typeString": "function () pure returns (bytes memory)"
                                    }
                                  },
                                  "id": 9057,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "1020:42:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                ],
                                "id": 9052,
                                "name": "keccak256",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13262,
                                "src": "1010:9:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                  "typeString": "function () pure returns (bytes32)"
                                }
                              },
                              "id": 9058,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1010:53:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9050,
                              "name": "database",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9028,
                              "src": "986:8:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DBInterface_$6501",
                                "typeString": "contract DBInterface"
                              }
                            },
                            "id": 9051,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "addressStorage",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6472,
                            "src": "986:23:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                              "typeString": "function (bytes32) view external returns (address)"
                            }
                          },
                          "id": 9059,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "986:78:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "src": "972:92:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9047,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "964:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9061,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "964:101:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9062,
                  "nodeType": "ExpressionStatement",
                  "src": "964:101:36"
                },
                {
                  "assignments": [
                    9064
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9064,
                      "name": "token",
                      "nodeType": "VariableDeclaration",
                      "scope": 9211,
                      "src": "1071:12:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DToken_$9023",
                        "typeString": "contract DToken"
                      },
                      "typeName": {
                        "contractScope": null,
                        "id": 9063,
                        "name": "DToken",
                        "nodeType": "UserDefinedTypeName",
                        "referencedDeclaration": 9023,
                        "src": "1071:6:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DToken_$9023",
                          "typeString": "contract DToken"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9077,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "746f6b656e41646472657373",
                                    "id": 9071,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "string",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "1144:14:36",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    "value": "tokenAddress"
                                  },
                                  {
                                    "argumentTypes": null,
                                    "id": 9072,
                                    "name": "_assetID",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9042,
                                    "src": "1160:8:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9069,
                                    "name": "abi",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13255,
                                    "src": "1127:3:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_abi",
                                      "typeString": "abi"
                                    }
                                  },
                                  "id": 9070,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "memberName": "encodePacked",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "1127:16:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                    "typeString": "function () pure returns (bytes memory)"
                                  }
                                },
                                "id": 9073,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1127:42:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              ],
                              "id": 9068,
                              "name": "keccak256",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13262,
                              "src": "1117:9:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                "typeString": "function () pure returns (bytes32)"
                              }
                            },
                            "id": 9074,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1117:53:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 9066,
                            "name": "database",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9028,
                            "src": "1093:8:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DBInterface_$6501",
                              "typeString": "contract DBInterface"
                            }
                          },
                          "id": 9067,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "addressStorage",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6472,
                          "src": "1093:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                            "typeString": "function (bytes32) view external returns (address)"
                          }
                        },
                        "id": 9075,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1093:78:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 9065,
                      "name": "DToken",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9023,
                      "src": "1086:6:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                        "typeString": "type(contract DToken)"
                      }
                    },
                    "id": 9076,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1086:86:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_DToken_$9023",
                      "typeString": "contract DToken"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1071:101:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "id": 9085,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9080,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9064,
                              "src": "1194:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            ],
                            "id": 9079,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "lValueRequested": false,
                            "nodeType": "ElementaryTypeNameExpression",
                            "src": "1186:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_address_$",
                              "typeString": "type(address)"
                            },
                            "typeName": "address"
                          },
                          "id": 9081,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1186:14:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "!=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "hexValue": "30",
                              "id": 9083,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "kind": "number",
                              "lValueRequested": false,
                              "nodeType": "Literal",
                              "src": "1212:1:36",
                              "subdenomination": null,
                              "typeDescriptions": {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              },
                              "value": "0"
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              }
                            ],
                            "id": 9082,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "lValueRequested": false,
                            "nodeType": "ElementaryTypeNameExpression",
                            "src": "1204:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_address_$",
                              "typeString": "type(address)"
                            },
                            "typeName": "address"
                          },
                          "id": 9084,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1204:10:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "src": "1186:28:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9078,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "1178:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9086,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1178:37:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9087,
                  "nodeType": "ExpressionStatement",
                  "src": "1178:37:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9089,
                      "name": "amountOwed",
                      "nodeType": "VariableDeclaration",
                      "scope": 9211,
                      "src": "1221:15:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 9088,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "1221:4:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9090,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1221:15:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9092,
                      "name": "balanceBefore",
                      "nodeType": "VariableDeclaration",
                      "scope": 9211,
                      "src": "1242:18:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 9091,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "1242:4:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9093,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1242:18:36"
                },
                {
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    },
                    "id": 9100,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "arguments": [],
                      "expression": {
                        "argumentTypes": [],
                        "expression": {
                          "argumentTypes": null,
                          "id": 9094,
                          "name": "token",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9064,
                          "src": "1270:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "id": 9095,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "getERC20",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": 9022,
                        "src": "1270:14:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_function_external_view$__$returns$_t_address_$",
                          "typeString": "function () view external returns (address)"
                        }
                      },
                      "id": 9096,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "functionCall",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "1270:16:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "==",
                    "rightExpression": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "hexValue": "30",
                          "id": 9098,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "1298:1:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_0_by_1",
                            "typeString": "int_const 0"
                          },
                          "value": "0"
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_rational_0_by_1",
                            "typeString": "int_const 0"
                          }
                        ],
                        "id": 9097,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "lValueRequested": false,
                        "nodeType": "ElementaryTypeNameExpression",
                        "src": "1290:7:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_type$_t_address_$",
                          "typeString": "type(address)"
                        },
                        "typeName": "address"
                      },
                      "id": 9099,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "typeConversion",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "1290:10:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "src": "1270:30:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "falseBody": {
                    "id": 9206,
                    "nodeType": "Block",
                    "src": "1632:306:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9161,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9154,
                            "name": "amountOwed",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9089,
                            "src": "1640:10:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9158,
                                    "name": "this",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13383,
                                    "src": "1681:4:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  ],
                                  "id": 9157,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "1673:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9159,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1673:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9155,
                                "name": "token",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9064,
                                "src": "1653:5:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_DToken_$9023",
                                  "typeString": "contract DToken"
                                }
                              },
                              "id": 9156,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "getAmountOwed",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 9001,
                              "src": "1653:19:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                "typeString": "function (address) view external returns (uint256)"
                              }
                            },
                            "id": 9160,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1653:34:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1640:47:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9162,
                        "nodeType": "ExpressionStatement",
                        "src": "1640:47:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9166,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9164,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9089,
                                "src": "1703:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9165,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "1716:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "1703:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9163,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1695:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9167,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1695:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9168,
                        "nodeType": "ExpressionStatement",
                        "src": "1695:23:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9176,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9169,
                            "name": "balanceBefore",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9092,
                            "src": "1726:13:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9173,
                                    "name": "this",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13383,
                                    "src": "1766:4:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  ],
                                  "id": 9172,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "1758:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9174,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1758:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9170,
                                "name": "token",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9064,
                                "src": "1742:5:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_DToken_$9023",
                                  "typeString": "contract DToken"
                                }
                              },
                              "id": 9171,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "balanceOf",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 9008,
                              "src": "1742:15:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                "typeString": "function (address) view external returns (uint256)"
                              }
                            },
                            "id": 9175,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1742:30:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1726:46:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9177,
                        "nodeType": "ExpressionStatement",
                        "src": "1726:46:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9179,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9064,
                                  "src": "1788:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9180,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "1788:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9181,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1788:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9178,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1780:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9182,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1780:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9183,
                        "nodeType": "ExpressionStatement",
                        "src": "1780:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9195,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9192,
                                    "name": "amountOwed",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9089,
                                    "src": "1856:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "id": 9188,
                                            "name": "this",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13383,
                                            "src": "1845:4:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          ],
                                          "id": 9187,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "nodeType": "ElementaryTypeNameExpression",
                                          "src": "1837:7:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_type$_t_address_$",
                                            "typeString": "type(address)"
                                          },
                                          "typeName": "address"
                                        },
                                        "id": 9189,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "typeConversion",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "1837:13:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": null,
                                        "id": 9185,
                                        "name": "token",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9064,
                                        "src": "1821:5:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_contract$_DToken_$9023",
                                          "typeString": "contract DToken"
                                        }
                                      },
                                      "id": 9186,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "memberName": "balanceOf",
                                      "nodeType": "MemberAccess",
                                      "referencedDeclaration": 9008,
                                      "src": "1821:15:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                        "typeString": "function (address) view external returns (uint256)"
                                      }
                                    },
                                    "id": 9190,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "1821:30:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  },
                                  "id": 9191,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "sub",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6890,
                                  "src": "1821:34:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                    "typeString": "function (uint256,uint256) pure returns (uint256)"
                                  }
                                },
                                "id": 9193,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1821:46:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9194,
                                "name": "balanceBefore",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9092,
                                "src": "1871:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "1821:63:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9184,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1813:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9196,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1813:72:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9197,
                        "nodeType": "ExpressionStatement",
                        "src": "1813:72:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "expression": {
                                "argumentTypes": null,
                                "id": 9201,
                                "name": "msg",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13268,
                                "src": "1908:3:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_message",
                                  "typeString": "msg"
                                }
                              },
                              "id": 9202,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "sender",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "1908:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            },
                            {
                              "argumentTypes": null,
                              "id": 9203,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9089,
                              "src": "1920:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9198,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9064,
                              "src": "1893:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9200,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "transfer",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9017,
                            "src": "1893:14:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_nonpayable$_t_address_$_t_uint256_$returns$_t_bool_$",
                              "typeString": "function (address,uint256) external returns (bool)"
                            }
                          },
                          "id": 9204,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1893:38:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_bool",
                            "typeString": "bool"
                          }
                        },
                        "id": 9205,
                        "nodeType": "ExpressionStatement",
                        "src": "1893:38:36"
                      }
                    ]
                  },
                  "id": 9207,
                  "nodeType": "IfStatement",
                  "src": "1266:672:36",
                  "trueBody": {
                    "id": 9153,
                    "nodeType": "Block",
                    "src": "1301:321:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9106,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9101,
                            "name": "balanceBefore",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9092,
                            "src": "1309:13:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9103,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "1333:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9102,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "1325:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9104,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1325:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            },
                            "id": 9105,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "balance",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1325:21:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1309:37:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9107,
                        "nodeType": "ExpressionStatement",
                        "src": "1309:37:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9115,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9108,
                            "name": "amountOwed",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9089,
                            "src": "1354:10:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9112,
                                    "name": "this",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13383,
                                    "src": "1395:4:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  ],
                                  "id": 9111,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "1387:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9113,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1387:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9109,
                                "name": "token",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9064,
                                "src": "1367:5:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_DToken_$9023",
                                  "typeString": "contract DToken"
                                }
                              },
                              "id": 9110,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "getAmountOwed",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 9001,
                              "src": "1367:19:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                "typeString": "function (address) view external returns (uint256)"
                              }
                            },
                            "id": 9114,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1367:34:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1354:47:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9116,
                        "nodeType": "ExpressionStatement",
                        "src": "1354:47:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9120,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9118,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9089,
                                "src": "1417:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9119,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "1430:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "1417:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9117,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1409:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9121,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1409:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9122,
                        "nodeType": "ExpressionStatement",
                        "src": "1409:23:36"
                      },
                      {
                        "assignments": [
                          9124
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9124,
                            "name": "balanceAfter",
                            "nodeType": "VariableDeclaration",
                            "scope": 9211,
                            "src": "1440:17:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9123,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "1440:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9129,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9127,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9089,
                              "src": "1478:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9125,
                              "name": "balanceBefore",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9092,
                              "src": "1460:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 9126,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "add",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6914,
                            "src": "1460:17:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 9128,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1460:29:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "1440:49:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9131,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9064,
                                  "src": "1505:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9132,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "1505:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9133,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1505:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9130,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1497:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9134,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1497:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9135,
                        "nodeType": "ExpressionStatement",
                        "src": "1497:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9142,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9138,
                                      "name": "this",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13383,
                                      "src": "1546:4:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    ],
                                    "id": 9137,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "nodeType": "ElementaryTypeNameExpression",
                                    "src": "1538:7:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_address_$",
                                      "typeString": "type(address)"
                                    },
                                    "typeName": "address"
                                  },
                                  "id": 9139,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "1538:13:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "id": 9140,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "balance",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "1538:21:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9141,
                                "name": "balanceAfter",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9124,
                                "src": "1563:12:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "1538:37:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9136,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1530:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9143,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1530:46:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9144,
                        "nodeType": "ExpressionStatement",
                        "src": "1530:46:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9150,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9089,
                              "src": "1604:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "expression": {
                                "argumentTypes": null,
                                "id": 9145,
                                "name": "msg",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13268,
                                "src": "1584:3:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_message",
                                  "typeString": "msg"
                                }
                              },
                              "id": 9148,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "sender",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "1584:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            },
                            "id": 9149,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "transfer",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1584:19:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_transfer_nonpayable$_t_uint256_$returns$__$",
                              "typeString": "function (uint256)"
                            }
                          },
                          "id": 9151,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1584:31:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9152,
                        "nodeType": "ExpressionStatement",
                        "src": "1584:31:36"
                      }
                    ]
                  }
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 9208,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "1950:4:36",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 9046,
                  "id": 9209,
                  "nodeType": "Return",
                  "src": "1943:11:36"
                }
              ]
            },
            "documentation": null,
            "id": 9211,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "withdraw",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9043,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9042,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 9211,
                  "src": "912:16:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 9041,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "912:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "911:18:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9046,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9045,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9211,
                  "src": "952:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9044,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "952:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "951:6:36"
            },
            "scope": 9607,
            "src": "894:1065:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 9434,
              "nodeType": "Block",
              "src": "2047:1332:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 9223,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9220,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9214,
                            "src": "2061:8:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                              "typeString": "bytes32[] calldata"
                            }
                          },
                          "id": 9221,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "length",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2061:15:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<",
                        "rightExpression": {
                          "argumentTypes": null,
                          "hexValue": "3530",
                          "id": 9222,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "2079:2:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_50_by_1",
                            "typeString": "int_const 50"
                          },
                          "value": "50"
                        },
                        "src": "2061:20:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9219,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "2053:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9224,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2053:29:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9225,
                  "nodeType": "ExpressionStatement",
                  "src": "2053:29:36"
                },
                {
                  "assignments": [
                    9229
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9229,
                      "name": "payoutAmounts",
                      "nodeType": "VariableDeclaration",
                      "scope": 9435,
                      "src": "2088:27:36",
                      "stateVariable": false,
                      "storageLocation": "memory",
                      "typeDescriptions": {
                        "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                        "typeString": "uint256[]"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9227,
                          "name": "uint",
                          "nodeType": "ElementaryTypeName",
                          "src": "2088:4:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9228,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2088:6:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_uint256_$dyn_storage_ptr",
                          "typeString": "uint256[]"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9236,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "expression": {
                          "argumentTypes": null,
                          "id": 9233,
                          "name": "_assetID",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9214,
                          "src": "2129:8:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                            "typeString": "bytes32[] calldata"
                          }
                        },
                        "id": 9234,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "length",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": null,
                        "src": "2129:15:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "id": 9232,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "NewExpression",
                      "src": "2118:10:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_objectcreation_pure$_t_uint256_$returns$_t_array$_t_uint256_$dyn_memory_$",
                        "typeString": "function (uint256) pure returns (uint256[] memory)"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9230,
                          "name": "uint",
                          "nodeType": "ElementaryTypeName",
                          "src": "2122:4:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9231,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2122:6:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_uint256_$dyn_storage_ptr",
                          "typeString": "uint256[]"
                        }
                      }
                    },
                    "id": 9235,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2118:27:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory",
                      "typeString": "uint256[] memory"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2088:57:36"
                },
                {
                  "assignments": [
                    9240
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9240,
                      "name": "tokenAddresses",
                      "nodeType": "VariableDeclaration",
                      "scope": 9435,
                      "src": "2151:31:36",
                      "stateVariable": false,
                      "storageLocation": "memory",
                      "typeDescriptions": {
                        "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                        "typeString": "address[]"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9238,
                          "name": "address",
                          "nodeType": "ElementaryTypeName",
                          "src": "2151:7:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "id": 9239,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2151:9:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_address_$dyn_storage_ptr",
                          "typeString": "address[]"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9247,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "expression": {
                          "argumentTypes": null,
                          "id": 9244,
                          "name": "_assetID",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9214,
                          "src": "2199:8:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                            "typeString": "bytes32[] calldata"
                          }
                        },
                        "id": 9245,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "length",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": null,
                        "src": "2199:15:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "id": 9243,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "NewExpression",
                      "src": "2185:13:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_objectcreation_pure$_t_uint256_$returns$_t_array$_t_address_$dyn_memory_$",
                        "typeString": "function (uint256) pure returns (address[] memory)"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9241,
                          "name": "address",
                          "nodeType": "ElementaryTypeName",
                          "src": "2189:7:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "id": 9242,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2189:9:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_address_$dyn_storage_ptr",
                          "typeString": "address[]"
                        }
                      }
                    },
                    "id": 9246,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2185:30:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_address_$dyn_memory",
                      "typeString": "address[] memory"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2151:64:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9249,
                      "name": "numEntries",
                      "nodeType": "VariableDeclaration",
                      "scope": 9435,
                      "src": "2221:16:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      },
                      "typeName": {
                        "id": 9248,
                        "name": "uint8",
                        "nodeType": "ElementaryTypeName",
                        "src": "2221:5:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9250,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2221:16:36"
                },
                {
                  "body": {
                    "id": 9403,
                    "nodeType": "Block",
                    "src": "2285:949:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              "id": 9277,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9263,
                                  "name": "msg",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13268,
                                  "src": "2301:3:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_magic_message",
                                    "typeString": "msg"
                                  }
                                },
                                "id": 9264,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "sender",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "2301:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "hexValue": "61737365744d616e61676572",
                                            "id": 9270,
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": true,
                                            "kind": "string",
                                            "lValueRequested": false,
                                            "nodeType": "Literal",
                                            "src": "2366:14:36",
                                            "subdenomination": null,
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            "value": "assetManager"
                                          },
                                          {
                                            "argumentTypes": null,
                                            "baseExpression": {
                                              "argumentTypes": null,
                                              "id": 9271,
                                              "name": "_assetID",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9214,
                                              "src": "2382:8:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                                "typeString": "bytes32[] calldata"
                                              }
                                            },
                                            "id": 9273,
                                            "indexExpression": {
                                              "argumentTypes": null,
                                              "id": 9272,
                                              "name": "i",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9252,
                                              "src": "2391:1:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_uint8",
                                                "typeString": "uint8"
                                              }
                                            },
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": false,
                                            "lValueRequested": false,
                                            "nodeType": "IndexAccess",
                                            "src": "2382:11:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          ],
                                          "expression": {
                                            "argumentTypes": null,
                                            "id": 9268,
                                            "name": "abi",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13255,
                                            "src": "2349:3:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_magic_abi",
                                              "typeString": "abi"
                                            }
                                          },
                                          "id": 9269,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "memberName": "encodePacked",
                                          "nodeType": "MemberAccess",
                                          "referencedDeclaration": null,
                                          "src": "2349:16:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                            "typeString": "function () pure returns (bytes memory)"
                                          }
                                        },
                                        "id": 9274,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "functionCall",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "2349:45:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      ],
                                      "id": 9267,
                                      "name": "keccak256",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13262,
                                      "src": "2339:9:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                        "typeString": "function () pure returns (bytes32)"
                                      }
                                    },
                                    "id": 9275,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "2339:56:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9265,
                                    "name": "database",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9028,
                                    "src": "2315:8:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_DBInterface_$6501",
                                      "typeString": "contract DBInterface"
                                    }
                                  },
                                  "id": 9266,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "addressStorage",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6472,
                                  "src": "2315:23:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                    "typeString": "function (bytes32) view external returns (address)"
                                  }
                                },
                                "id": 9276,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "2315:81:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "src": "2301:95:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9262,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "2293:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9278,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2293:105:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9279,
                        "nodeType": "ExpressionStatement",
                        "src": "2293:105:36"
                      },
                      {
                        "assignments": [
                          9281
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9281,
                            "name": "token",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2406:12:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DToken_$9023",
                              "typeString": "contract DToken"
                            },
                            "typeName": {
                              "contractScope": null,
                              "id": 9280,
                              "name": "DToken",
                              "nodeType": "UserDefinedTypeName",
                              "referencedDeclaration": 9023,
                              "src": "2406:6:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9296,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "arguments": [
                                        {
                                          "argumentTypes": null,
                                          "hexValue": "746f6b656e41646472657373",
                                          "id": 9288,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "kind": "string",
                                          "lValueRequested": false,
                                          "nodeType": "Literal",
                                          "src": "2479:14:36",
                                          "subdenomination": null,
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          "value": "tokenAddress"
                                        },
                                        {
                                          "argumentTypes": null,
                                          "baseExpression": {
                                            "argumentTypes": null,
                                            "id": 9289,
                                            "name": "_assetID",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9214,
                                            "src": "2495:8:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                              "typeString": "bytes32[] calldata"
                                            }
                                          },
                                          "id": 9291,
                                          "indexExpression": {
                                            "argumentTypes": null,
                                            "id": 9290,
                                            "name": "i",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9252,
                                            "src": "2504:1:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_uint8",
                                              "typeString": "uint8"
                                            }
                                          },
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": false,
                                          "lValueRequested": false,
                                          "nodeType": "IndexAccess",
                                          "src": "2495:11:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": [
                                          {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": null,
                                          "id": 9286,
                                          "name": "abi",
                                          "nodeType": "Identifier",
                                          "overloadedDeclarations": [],
                                          "referencedDeclaration": 13255,
                                          "src": "2462:3:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_magic_abi",
                                            "typeString": "abi"
                                          }
                                        },
                                        "id": 9287,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": true,
                                        "lValueRequested": false,
                                        "memberName": "encodePacked",
                                        "nodeType": "MemberAccess",
                                        "referencedDeclaration": null,
                                        "src": "2462:16:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                          "typeString": "function () pure returns (bytes memory)"
                                        }
                                      },
                                      "id": 9292,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "kind": "functionCall",
                                      "lValueRequested": false,
                                      "names": [],
                                      "nodeType": "FunctionCall",
                                      "src": "2462:45:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    ],
                                    "id": 9285,
                                    "name": "keccak256",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13262,
                                    "src": "2452:9:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                      "typeString": "function () pure returns (bytes32)"
                                    }
                                  },
                                  "id": 9293,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "2452:56:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9283,
                                  "name": "database",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9028,
                                  "src": "2428:8:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DBInterface_$6501",
                                    "typeString": "contract DBInterface"
                                  }
                                },
                                "id": 9284,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "addressStorage",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6472,
                                "src": "2428:23:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                  "typeString": "function (bytes32) view external returns (address)"
                                }
                              },
                              "id": 9294,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2428:81:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9282,
                            "name": "DToken",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9023,
                            "src": "2421:6:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                              "typeString": "type(contract DToken)"
                            }
                          },
                          "id": 9295,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2421:89:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2406:104:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              "id": 9304,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9299,
                                    "name": "token",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9281,
                                    "src": "2534:5:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_DToken_$9023",
                                      "typeString": "contract DToken"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_DToken_$9023",
                                      "typeString": "contract DToken"
                                    }
                                  ],
                                  "id": 9298,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "2526:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9300,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "2526:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "!=",
                              "rightExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "30",
                                    "id": 9302,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "number",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "2552:1:36",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_rational_0_by_1",
                                      "typeString": "int_const 0"
                                    },
                                    "value": "0"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_rational_0_by_1",
                                      "typeString": "int_const 0"
                                    }
                                  ],
                                  "id": 9301,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "2544:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9303,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "2544:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "src": "2526:28:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9297,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "2518:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9305,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2518:37:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9306,
                        "nodeType": "ExpressionStatement",
                        "src": "2518:37:36"
                      },
                      {
                        "assignments": [
                          9308
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9308,
                            "name": "tokensOwed",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2563:15:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9307,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "2563:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9315,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9312,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "2609:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9311,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "2601:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9313,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2601:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9309,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9281,
                              "src": "2581:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9310,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "getAmountOwed",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9001,
                            "src": "2581:19:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                              "typeString": "function (address) view external returns (uint256)"
                            }
                          },
                          "id": 9314,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2581:34:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2563:52:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9319,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9317,
                                "name": "tokensOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9308,
                                "src": "2631:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9318,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "2644:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "2631:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9316,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "2623:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9320,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2623:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9321,
                        "nodeType": "ExpressionStatement",
                        "src": "2623:23:36"
                      },
                      {
                        "assignments": [
                          9323
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9323,
                            "name": "fundingToken",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2654:19:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DToken_$9023",
                              "typeString": "contract DToken"
                            },
                            "typeName": {
                              "contractScope": null,
                              "id": 9322,
                              "name": "DToken",
                              "nodeType": "UserDefinedTypeName",
                              "referencedDeclaration": 9023,
                              "src": "2654:6:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9329,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9325,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9281,
                                  "src": "2683:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9326,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "getERC20",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 9022,
                                "src": "2683:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$__$returns$_t_address_$",
                                  "typeString": "function () view external returns (address)"
                                }
                              },
                              "id": 9327,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2683:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9324,
                            "name": "DToken",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9023,
                            "src": "2676:6:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                              "typeString": "type(contract DToken)"
                            }
                          },
                          "id": 9328,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2676:24:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2654:46:36"
                      },
                      {
                        "assignments": [
                          9331
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9331,
                            "name": "balanceBefore",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2708:18:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9330,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "2708:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9338,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9335,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "2760:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9334,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "2752:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9336,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2752:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9332,
                              "name": "fundingToken",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9323,
                              "src": "2729:12:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9333,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "balanceOf",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9008,
                            "src": "2729:22:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                              "typeString": "function (address) view external returns (uint256)"
                            }
                          },
                          "id": 9337,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2729:37:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2708:58:36"
                      },
                      {
                        "assignments": [
                          9340
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9340,
                            "name": "tokenIndex",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2774:16:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint8",
                              "typeString": "uint8"
                            },
                            "typeName": {
                              "id": 9339,
                              "name": "uint8",
                              "nodeType": "ElementaryTypeName",
                              "src": "2774:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint8",
                                "typeString": "uint8"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9347,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9342,
                              "name": "tokenAddresses",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9240,
                              "src": "2809:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                "typeString": "address[] memory"
                              }
                            },
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9344,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9281,
                                  "src": "2833:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                ],
                                "id": 9343,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "2825:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9345,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2825:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                "typeString": "address[] memory"
                              },
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9341,
                            "name": "containsAddress",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9602,
                            "src": "2793:15:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_array$_t_address_$dyn_memory_ptr_$_t_address_$returns$_t_uint8_$",
                              "typeString": "function (address[] memory,address) pure returns (uint8)"
                            }
                          },
                          "id": 9346,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2793:47:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2774:66:36"
                      },
                      {
                        "condition": {
                          "argumentTypes": null,
                          "commonType": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          },
                          "id": 9351,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftExpression": {
                            "argumentTypes": null,
                            "id": 9348,
                            "name": "tokenIndex",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9340,
                            "src": "2852:10:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint8",
                              "typeString": "uint8"
                            }
                          },
                          "nodeType": "BinaryOperation",
                          "operator": "<",
                          "rightExpression": {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "id": 9349,
                              "name": "_assetID",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9214,
                              "src": "2865:8:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                "typeString": "bytes32[] calldata"
                              }
                            },
                            "id": 9350,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "length",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "2865:15:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "2852:28:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_bool",
                            "typeString": "bool"
                          }
                        },
                        "falseBody": {
                          "id": 9381,
                          "nodeType": "Block",
                          "src": "2969:139:36",
                          "statements": [
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9370,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "leftHandSide": {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9364,
                                    "name": "tokenAddresses",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9240,
                                    "src": "2979:14:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                      "typeString": "address[] memory"
                                    }
                                  },
                                  "id": 9366,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9365,
                                    "name": "numEntries",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9249,
                                    "src": "2994:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": true,
                                  "nodeType": "IndexAccess",
                                  "src": "2979:26:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "nodeType": "Assignment",
                                "operator": "=",
                                "rightHandSide": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9368,
                                      "name": "fundingToken",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 9323,
                                      "src": "3016:12:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_contract$_DToken_$9023",
                                        "typeString": "contract DToken"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_contract$_DToken_$9023",
                                        "typeString": "contract DToken"
                                      }
                                    ],
                                    "id": 9367,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "nodeType": "ElementaryTypeNameExpression",
                                    "src": "3008:7:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_address_$",
                                      "typeString": "type(address)"
                                    },
                                    "typeName": "address"
                                  },
                                  "id": 9369,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "3008:21:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "src": "2979:50:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "id": 9371,
                              "nodeType": "ExpressionStatement",
                              "src": "2979:50:36"
                            },
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9376,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "leftHandSide": {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9372,
                                    "name": "payoutAmounts",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9229,
                                    "src": "3039:13:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                      "typeString": "uint256[] memory"
                                    }
                                  },
                                  "id": 9374,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9373,
                                    "name": "numEntries",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9249,
                                    "src": "3053:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": true,
                                  "nodeType": "IndexAccess",
                                  "src": "3039:25:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "nodeType": "Assignment",
                                "operator": "=",
                                "rightHandSide": {
                                  "argumentTypes": null,
                                  "id": 9375,
                                  "name": "tokensOwed",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9308,
                                  "src": "3067:10:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "src": "3039:38:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "id": 9377,
                              "nodeType": "ExpressionStatement",
                              "src": "3039:38:36"
                            },
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9379,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "nodeType": "UnaryOperation",
                                "operator": "++",
                                "prefix": false,
                                "src": "3087:12:36",
                                "subExpression": {
                                  "argumentTypes": null,
                                  "id": 9378,
                                  "name": "numEntries",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9249,
                                  "src": "3087:10:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint8",
                                    "typeString": "uint8"
                                  }
                                },
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint8",
                                  "typeString": "uint8"
                                }
                              },
                              "id": 9380,
                              "nodeType": "ExpressionStatement",
                              "src": "3087:12:36"
                            }
                          ]
                        },
                        "id": 9382,
                        "nodeType": "IfStatement",
                        "src": "2848:260:36",
                        "trueBody": {
                          "id": 9363,
                          "nodeType": "Block",
                          "src": "2882:75:36",
                          "statements": [
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9361,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "leftHandSide": {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9352,
                                    "name": "payoutAmounts",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9229,
                                    "src": "2885:13:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                      "typeString": "uint256[] memory"
                                    }
                                  },
                                  "id": 9354,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9353,
                                    "name": "tokenIndex",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9340,
                                    "src": "2899:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": true,
                                  "nodeType": "IndexAccess",
                                  "src": "2885:25:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "nodeType": "Assignment",
                                "operator": "=",
                                "rightHandSide": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9359,
                                      "name": "tokensOwed",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 9308,
                                      "src": "2943:10:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_uint256",
                                        "typeString": "uint256"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_uint256",
                                        "typeString": "uint256"
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": null,
                                      "baseExpression": {
                                        "argumentTypes": null,
                                        "id": 9355,
                                        "name": "payoutAmounts",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9229,
                                        "src": "2913:13:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                          "typeString": "uint256[] memory"
                                        }
                                      },
                                      "id": 9357,
                                      "indexExpression": {
                                        "argumentTypes": null,
                                        "id": 9356,
                                        "name": "tokenIndex",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9340,
                                        "src": "2927:10:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_uint8",
                                          "typeString": "uint8"
                                        }
                                      },
                                      "isConstant": false,
                                      "isLValue": true,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "nodeType": "IndexAccess",
                                      "src": "2913:25:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_uint256",
                                        "typeString": "uint256"
                                      }
                                    },
                                    "id": 9358,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "lValueRequested": false,
                                    "memberName": "add",
                                    "nodeType": "MemberAccess",
                                    "referencedDeclaration": 6914,
                                    "src": "2913:29:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                      "typeString": "function (uint256,uint256) pure returns (uint256)"
                                    }
                                  },
                                  "id": 9360,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "2913:41:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "src": "2885:69:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "id": 9362,
                              "nodeType": "ExpressionStatement",
                              "src": "2885:69:36"
                            }
                          ]
                        }
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9384,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9281,
                                  "src": "3123:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9385,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "3123:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9386,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3123:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9383,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3115:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9387,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3115:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9388,
                        "nodeType": "ExpressionStatement",
                        "src": "3115:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9400,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9397,
                                    "name": "tokensOwed",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9308,
                                    "src": "3198:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "id": 9393,
                                            "name": "this",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13383,
                                            "src": "3187:4:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          ],
                                          "id": 9392,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "nodeType": "ElementaryTypeNameExpression",
                                          "src": "3179:7:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_type$_t_address_$",
                                            "typeString": "type(address)"
                                          },
                                          "typeName": "address"
                                        },
                                        "id": 9394,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "typeConversion",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "3179:13:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": null,
                                        "id": 9390,
                                        "name": "fundingToken",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9323,
                                        "src": "3156:12:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_contract$_DToken_$9023",
                                          "typeString": "contract DToken"
                                        }
                                      },
                                      "id": 9391,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "memberName": "balanceOf",
                                      "nodeType": "MemberAccess",
                                      "referencedDeclaration": 9008,
                                      "src": "3156:22:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                        "typeString": "function (address) view external returns (uint256)"
                                      }
                                    },
                                    "id": 9395,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "3156:37:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  },
                                  "id": 9396,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "sub",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6890,
                                  "src": "3156:41:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                    "typeString": "function (uint256,uint256) pure returns (uint256)"
                                  }
                                },
                                "id": 9398,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "3156:53:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9399,
                                "name": "balanceBefore",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9331,
                                "src": "3213:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "3156:70:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9389,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3148:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9401,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3148:79:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9402,
                        "nodeType": "ExpressionStatement",
                        "src": "3148:79:36"
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 9258,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9255,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9252,
                      "src": "2260:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "expression": {
                        "argumentTypes": null,
                        "id": 9256,
                        "name": "_assetID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9214,
                        "src": "2264:8:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                          "typeString": "bytes32[] calldata"
                        }
                      },
                      "id": 9257,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "length",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "2264:15:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "src": "2260:19:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9404,
                  "initializationExpression": {
                    "assignments": [
                      9252
                    ],
                    "declarations": [
                      {
                        "constant": false,
                        "id": 9252,
                        "name": "i",
                        "nodeType": "VariableDeclaration",
                        "scope": 9435,
                        "src": "2247:7:36",
                        "stateVariable": false,
                        "storageLocation": "default",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        },
                        "typeName": {
                          "id": 9251,
                          "name": "uint8",
                          "nodeType": "ElementaryTypeName",
                          "src": "2247:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "value": null,
                        "visibility": "internal"
                      }
                    ],
                    "id": 9254,
                    "initialValue": {
                      "argumentTypes": null,
                      "hexValue": "30",
                      "id": 9253,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "2257:1:36",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_0_by_1",
                        "typeString": "int_const 0"
                      },
                      "value": "0"
                    },
                    "nodeType": "VariableDeclarationStatement",
                    "src": "2247:11:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9260,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "2281:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9259,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9252,
                        "src": "2281:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9261,
                    "nodeType": "ExpressionStatement",
                    "src": "2281:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "2243:991:36"
                },
                {
                  "body": {
                    "id": 9430,
                    "nodeType": "Block",
                    "src": "3271:87:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9422,
                                    "name": "msg",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13268,
                                    "src": "3321:3:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_message",
                                      "typeString": "msg"
                                    }
                                  },
                                  "id": 9423,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "sender",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "3321:10:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9424,
                                    "name": "payoutAmounts",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9229,
                                    "src": "3333:13:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                      "typeString": "uint256[] memory"
                                    }
                                  },
                                  "id": 9426,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9425,
                                    "name": "i",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9252,
                                    "src": "3347:1:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "nodeType": "IndexAccess",
                                  "src": "3333:16:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  },
                                  {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "baseExpression": {
                                        "argumentTypes": null,
                                        "id": 9417,
                                        "name": "tokenAddresses",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9240,
                                        "src": "3293:14:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                          "typeString": "address[] memory"
                                        }
                                      },
                                      "id": 9419,
                                      "indexExpression": {
                                        "argumentTypes": null,
                                        "id": 9418,
                                        "name": "i",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9252,
                                        "src": "3308:1:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_uint8",
                                          "typeString": "uint8"
                                        }
                                      },
                                      "isConstant": false,
                                      "isLValue": true,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "nodeType": "IndexAccess",
                                      "src": "3293:17:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_address",
                                        "typeString": "address"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_address",
                                        "typeString": "address"
                                      }
                                    ],
                                    "id": 9416,
                                    "name": "ERC20",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 6697,
                                    "src": "3287:5:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_contract$_ERC20_$6697_$",
                                      "typeString": "type(contract ERC20)"
                                    }
                                  },
                                  "id": 9420,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "3287:24:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_ERC20_$6697",
                                    "typeString": "contract ERC20"
                                  }
                                },
                                "id": 9421,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "transfer",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6660,
                                "src": "3287:33:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$_t_address_$_t_uint256_$returns$_t_bool_$",
                                  "typeString": "function (address,uint256) external returns (bool)"
                                }
                              },
                              "id": 9427,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3287:63:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9415,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3279:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9428,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3279:72:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9429,
                        "nodeType": "ExpressionStatement",
                        "src": "3279:72:36"
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint8",
                      "typeString": "uint8"
                    },
                    "id": 9411,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9409,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9252,
                      "src": "3251:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "id": 9410,
                      "name": "numEntries",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9249,
                      "src": "3255:10:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "src": "3251:14:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9431,
                  "initializationExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9407,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "leftHandSide": {
                        "argumentTypes": null,
                        "id": 9405,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9252,
                        "src": "3244:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "nodeType": "Assignment",
                      "operator": "=",
                      "rightHandSide": {
                        "argumentTypes": null,
                        "hexValue": "30",
                        "id": 9406,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "number",
                        "lValueRequested": false,
                        "nodeType": "Literal",
                        "src": "3248:1:36",
                        "subdenomination": null,
                        "typeDescriptions": {
                          "typeIdentifier": "t_rational_0_by_1",
                          "typeString": "int_const 0"
                        },
                        "value": "0"
                      },
                      "src": "3244:5:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9408,
                    "nodeType": "ExpressionStatement",
                    "src": "3244:5:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9413,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "3267:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9412,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9252,
                        "src": "3267:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9414,
                    "nodeType": "ExpressionStatement",
                    "src": "3267:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "3240:118:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 9432,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "3370:4:36",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 9218,
                  "id": 9433,
                  "nodeType": "Return",
                  "src": "3363:11:36"
                }
              ]
            },
            "documentation": null,
            "id": 9435,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "retrieveAssetManagerTokens",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9215,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9214,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 9435,
                  "src": "1999:18:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                    "typeString": "bytes32[]"
                  },
                  "typeName": {
                    "baseType": {
                      "id": 9212,
                      "name": "bytes32",
                      "nodeType": "ElementaryTypeName",
                      "src": "1999:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      }
                    },
                    "id": 9213,
                    "length": null,
                    "nodeType": "ArrayTypeName",
                    "src": "1999:9:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_bytes32_$dyn_storage_ptr",
                      "typeString": "bytes32[]"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "1998:20:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9218,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9217,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9435,
                  "src": "2041:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9216,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "2041:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "2040:6:36"
            },
            "scope": 9607,
            "src": "1963:1416:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 9562,
              "nodeType": "Block",
              "src": "3465:713:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 9447,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9444,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9438,
                            "src": "3479:8:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                              "typeString": "bytes32[] calldata"
                            }
                          },
                          "id": 9445,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "length",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3479:15:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<",
                        "rightExpression": {
                          "argumentTypes": null,
                          "hexValue": "3530",
                          "id": 9446,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "3497:2:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_50_by_1",
                            "typeString": "int_const 50"
                          },
                          "value": "50"
                        },
                        "src": "3479:20:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9443,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "3471:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9448,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3471:29:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9449,
                  "nodeType": "ExpressionStatement",
                  "src": "3471:29:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9451,
                      "name": "weiOwed",
                      "nodeType": "VariableDeclaration",
                      "scope": 9563,
                      "src": "3506:12:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 9450,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "3506:4:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9452,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3506:12:36"
                },
                {
                  "body": {
                    "id": 9550,
                    "nodeType": "Block",
                    "src": "3566:557:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              "id": 9479,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9465,
                                  "name": "msg",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13268,
                                  "src": "3582:3:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_magic_message",
                                    "typeString": "msg"
                                  }
                                },
                                "id": 9466,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "sender",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "3582:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "hexValue": "61737365744d616e61676572",
                                            "id": 9472,
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": true,
                                            "kind": "string",
                                            "lValueRequested": false,
                                            "nodeType": "Literal",
                                            "src": "3647:14:36",
                                            "subdenomination": null,
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            "value": "assetManager"
                                          },
                                          {
                                            "argumentTypes": null,
                                            "baseExpression": {
                                              "argumentTypes": null,
                                              "id": 9473,
                                              "name": "_assetID",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9438,
                                              "src": "3663:8:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                                "typeString": "bytes32[] calldata"
                                              }
                                            },
                                            "id": 9475,
                                            "indexExpression": {
                                              "argumentTypes": null,
                                              "id": 9474,
                                              "name": "i",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9454,
                                              "src": "3672:1:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_uint8",
                                                "typeString": "uint8"
                                              }
                                            },
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": false,
                                            "lValueRequested": false,
                                            "nodeType": "IndexAccess",
                                            "src": "3663:11:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          ],
                                          "expression": {
                                            "argumentTypes": null,
                                            "id": 9470,
                                            "name": "abi",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13255,
                                            "src": "3630:3:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_magic_abi",
                                              "typeString": "abi"
                                            }
                                          },
                                          "id": 9471,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "memberName": "encodePacked",
                                          "nodeType": "MemberAccess",
                                          "referencedDeclaration": null,
                                          "src": "3630:16:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                            "typeString": "function () pure returns (bytes memory)"
                                          }
                                        },
                                        "id": 9476,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "functionCall",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "3630:45:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      ],
                                      "id": 9469,
                                      "name": "keccak256",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13262,
                                      "src": "3620:9:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                        "typeString": "function () pure returns (bytes32)"
                                      }
                                    },
                                    "id": 9477,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "3620:56:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9467,
                                    "name": "database",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9028,
                                    "src": "3596:8:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_DBInterface_$6501",
                                      "typeString": "contract DBInterface"
                                    }
                                  },
                                  "id": 9468,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "addressStorage",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6472,
                                  "src": "3596:23:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                    "typeString": "function (bytes32) view external returns (address)"
                                  }
                                },
                                "id": 9478,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "3596:81:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "src": "3582:95:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9464,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3574:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9480,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3574:104:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9481,
                        "nodeType": "ExpressionStatement",
                        "src": "3574:104:36"
                      },
                      {
                        "assignments": [
                          9483
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9483,
                            "name": "token",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3686:12:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DToken_$9023",
                              "typeString": "contract DToken"
                            },
                            "typeName": {
                              "contractScope": null,
                              "id": 9482,
                              "name": "DToken",
                              "nodeType": "UserDefinedTypeName",
                              "referencedDeclaration": 9023,
                              "src": "3686:6:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9498,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "arguments": [
                                        {
                                          "argumentTypes": null,
                                          "hexValue": "746f6b656e41646472657373",
                                          "id": 9490,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "kind": "string",
                                          "lValueRequested": false,
                                          "nodeType": "Literal",
                                          "src": "3759:14:36",
                                          "subdenomination": null,
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          "value": "tokenAddress"
                                        },
                                        {
                                          "argumentTypes": null,
                                          "baseExpression": {
                                            "argumentTypes": null,
                                            "id": 9491,
                                            "name": "_assetID",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9438,
                                            "src": "3775:8:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                              "typeString": "bytes32[] calldata"
                                            }
                                          },
                                          "id": 9493,
                                          "indexExpression": {
                                            "argumentTypes": null,
                                            "id": 9492,
                                            "name": "i",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9454,
                                            "src": "3784:1:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_uint8",
                                              "typeString": "uint8"
                                            }
                                          },
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": false,
                                          "lValueRequested": false,
                                          "nodeType": "IndexAccess",
                                          "src": "3775:11:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": [
                                          {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": null,
                                          "id": 9488,
                                          "name": "abi",
                                          "nodeType": "Identifier",
                                          "overloadedDeclarations": [],
                                          "referencedDeclaration": 13255,
                                          "src": "3742:3:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_magic_abi",
                                            "typeString": "abi"
                                          }
                                        },
                                        "id": 9489,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": true,
                                        "lValueRequested": false,
                                        "memberName": "encodePacked",
                                        "nodeType": "MemberAccess",
                                        "referencedDeclaration": null,
                                        "src": "3742:16:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                          "typeString": "function () pure returns (bytes memory)"
                                        }
                                      },
                                      "id": 9494,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "kind": "functionCall",
                                      "lValueRequested": false,
                                      "names": [],
                                      "nodeType": "FunctionCall",
                                      "src": "3742:45:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    ],
                                    "id": 9487,
                                    "name": "keccak256",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13262,
                                    "src": "3732:9:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                      "typeString": "function () pure returns (bytes32)"
                                    }
                                  },
                                  "id": 9495,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "3732:56:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9485,
                                  "name": "database",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9028,
                                  "src": "3708:8:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DBInterface_$6501",
                                    "typeString": "contract DBInterface"
                                  }
                                },
                                "id": 9486,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "addressStorage",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6472,
                                "src": "3708:23:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                  "typeString": "function (bytes32) view external returns (address)"
                                }
                              },
                              "id": 9496,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3708:81:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9484,
                            "name": "DToken",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9023,
                            "src": "3701:6:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                              "typeString": "type(contract DToken)"
                            }
                          },
                          "id": 9497,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3701:89:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3686:104:36"
                      },
                      {
                        "assignments": [
                          9500
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9500,
                            "name": "balanceBefore",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3798:18:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9499,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "3798:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9505,
                        "initialValue": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "id": 9502,
                                "name": "this",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13383,
                                "src": "3827:4:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                  "typeString": "contract AssetManagerFunds"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                  "typeString": "contract AssetManagerFunds"
                                }
                              ],
                              "id": 9501,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "nodeType": "ElementaryTypeNameExpression",
                              "src": "3819:7:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_type$_t_address_$",
                                "typeString": "type(address)"
                              },
                              "typeName": "address"
                            },
                            "id": 9503,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "typeConversion",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "3819:13:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          "id": 9504,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "balance",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3819:21:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3798:42:36"
                      },
                      {
                        "assignments": [
                          9507
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9507,
                            "name": "amountOwed",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3848:15:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9506,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "3848:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9514,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9511,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "3894:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9510,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "3886:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9512,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3886:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9508,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9483,
                              "src": "3866:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9509,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "getAmountOwed",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9001,
                            "src": "3866:19:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                              "typeString": "function (address) view external returns (uint256)"
                            }
                          },
                          "id": 9513,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3866:34:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3848:52:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9518,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9516,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9507,
                                "src": "3916:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9517,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "3929:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "3916:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9515,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3908:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9519,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3908:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9520,
                        "nodeType": "ExpressionStatement",
                        "src": "3908:23:36"
                      },
                      {
                        "assignments": [
                          9522
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9522,
                            "name": "balanceAfter",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3939:17:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9521,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "3939:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9527,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9525,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9507,
                              "src": "3977:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9523,
                              "name": "balanceBefore",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9500,
                              "src": "3959:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 9524,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "add",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6914,
                            "src": "3959:17:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 9526,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3959:29:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3939:49:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9529,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9483,
                                  "src": "4004:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9530,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "4004:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9531,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "4004:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9528,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3996:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9532,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3996:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9533,
                        "nodeType": "ExpressionStatement",
                        "src": "3996:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9540,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9536,
                                      "name": "this",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13383,
                                      "src": "4045:4:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    ],
                                    "id": 9535,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "nodeType": "ElementaryTypeNameExpression",
                                    "src": "4037:7:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_address_$",
                                      "typeString": "type(address)"
                                    },
                                    "typeName": "address"
                                  },
                                  "id": 9537,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "4037:13:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "id": 9538,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "balance",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "4037:21:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9539,
                                "name": "balanceAfter",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9522,
                                "src": "4062:12:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "4037:37:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9534,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "4029:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9541,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "4029:46:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9542,
                        "nodeType": "ExpressionStatement",
                        "src": "4029:46:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9548,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9543,
                            "name": "weiOwed",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9451,
                            "src": "4083:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "id": 9546,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9507,
                                "src": "4105:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9544,
                                "name": "weiOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9451,
                                "src": "4093:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "id": 9545,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "add",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 6914,
                              "src": "4093:11:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                "typeString": "function (uint256,uint256) pure returns (uint256)"
                              }
                            },
                            "id": 9547,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4093:23:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "4083:33:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9549,
                        "nodeType": "ExpressionStatement",
                        "src": "4083:33:36"
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 9460,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9457,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9454,
                      "src": "3541:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "expression": {
                        "argumentTypes": null,
                        "id": 9458,
                        "name": "_assetID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9438,
                        "src": "3545:8:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                          "typeString": "bytes32[] calldata"
                        }
                      },
                      "id": 9459,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "length",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "3545:15:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "src": "3541:19:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9551,
                  "initializationExpression": {
                    "assignments": [
                      9454
                    ],
                    "declarations": [
                      {
                        "constant": false,
                        "id": 9454,
                        "name": "i",
                        "nodeType": "VariableDeclaration",
                        "scope": 9563,
                        "src": "3528:7:36",
                        "stateVariable": false,
                        "storageLocation": "default",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        },
                        "typeName": {
                          "id": 9453,
                          "name": "uint8",
                          "nodeType": "ElementaryTypeName",
                          "src": "3528:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "value": null,
                        "visibility": "internal"
                      }
                    ],
                    "id": 9456,
                    "initialValue": {
                      "argumentTypes": null,
                      "hexValue": "30",
                      "id": 9455,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "3538:1:36",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_0_by_1",
                        "typeString": "int_const 0"
                      },
                      "value": "0"
                    },
                    "nodeType": "VariableDeclarationStatement",
                    "src": "3528:11:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9462,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "3562:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9461,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9454,
                        "src": "3562:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9463,
                    "nodeType": "ExpressionStatement",
                    "src": "3562:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "3524:599:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 9557,
                        "name": "weiOwed",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9451,
                        "src": "4148:7:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "expression": {
                          "argumentTypes": null,
                          "id": 9552,
                          "name": "msg",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 13268,
                          "src": "4128:3:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_magic_message",
                            "typeString": "msg"
                          }
                        },
                        "id": 9555,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "sender",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": null,
                        "src": "4128:10:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      },
                      "id": 9556,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "transfer",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "4128:19:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_transfer_nonpayable$_t_uint256_$returns$__$",
                        "typeString": "function (uint256)"
                      }
                    },
                    "id": 9558,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4128:28:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9559,
                  "nodeType": "ExpressionStatement",
                  "src": "4128:28:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 9560,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "4169:4:36",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 9442,
                  "id": 9561,
                  "nodeType": "Return",
                  "src": "4162:11:36"
                }
              ]
            },
            "documentation": null,
            "id": 9563,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "retrieveAssetManagerETH",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9439,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9438,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 9563,
                  "src": "3417:18:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                    "typeString": "bytes32[]"
                  },
                  "typeName": {
                    "baseType": {
                      "id": 9436,
                      "name": "bytes32",
                      "nodeType": "ElementaryTypeName",
                      "src": "3417:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      }
                    },
                    "id": 9437,
                    "length": null,
                    "nodeType": "ArrayTypeName",
                    "src": "3417:9:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_bytes32_$dyn_storage_ptr",
                      "typeString": "bytes32[]"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3416:20:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9442,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9441,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9563,
                  "src": "3459:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9440,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "3459:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3458:6:36"
            },
            "scope": 9607,
            "src": "3384:794:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 9601,
              "nodeType": "Block",
              "src": "4282:153:36",
              "statements": [
                {
                  "body": {
                    "id": 9592,
                    "nodeType": "Block",
                    "src": "4335:53:36",
                    "statements": [
                      {
                        "condition": {
                          "argumentTypes": null,
                          "commonType": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          },
                          "id": 9588,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftExpression": {
                            "argumentTypes": null,
                            "baseExpression": {
                              "argumentTypes": null,
                              "id": 9584,
                              "name": "_addressList",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9566,
                              "src": "4347:12:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                "typeString": "address[] memory"
                              }
                            },
                            "id": 9586,
                            "indexExpression": {
                              "argumentTypes": null,
                              "id": 9585,
                              "name": "i",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9574,
                              "src": "4360:1:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint8",
                                "typeString": "uint8"
                              }
                            },
                            "isConstant": false,
                            "isLValue": true,
                            "isPure": false,
                            "lValueRequested": false,
                            "nodeType": "IndexAccess",
                            "src": "4347:15:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          "nodeType": "BinaryOperation",
                          "operator": "==",
                          "rightExpression": {
                            "argumentTypes": null,
                            "id": 9587,
                            "name": "_addr",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9568,
                            "src": "4366:5:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          "src": "4347:24:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_bool",
                            "typeString": "bool"
                          }
                        },
                        "falseBody": null,
                        "id": 9591,
                        "nodeType": "IfStatement",
                        "src": "4343:38:36",
                        "trueBody": {
                          "expression": {
                            "argumentTypes": null,
                            "id": 9589,
                            "name": "i",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9574,
                            "src": "4380:1:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint8",
                              "typeString": "uint8"
                            }
                          },
                          "functionReturnParameters": 9572,
                          "id": 9590,
                          "nodeType": "Return",
                          "src": "4373:8:36"
                        }
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 9580,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9577,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9574,
                      "src": "4306:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "expression": {
                        "argumentTypes": null,
                        "id": 9578,
                        "name": "_addressList",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9566,
                        "src": "4310:12:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                          "typeString": "address[] memory"
                        }
                      },
                      "id": 9579,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "length",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "4310:19:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "src": "4306:23:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9593,
                  "initializationExpression": {
                    "assignments": [
                      9574
                    ],
                    "declarations": [
                      {
                        "constant": false,
                        "id": 9574,
                        "name": "i",
                        "nodeType": "VariableDeclaration",
                        "scope": 9602,
                        "src": "4293:7:36",
                        "stateVariable": false,
                        "storageLocation": "default",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        },
                        "typeName": {
                          "id": 9573,
                          "name": "uint8",
                          "nodeType": "ElementaryTypeName",
                          "src": "4293:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "value": null,
                        "visibility": "internal"
                      }
                    ],
                    "id": 9576,
                    "initialValue": {
                      "argumentTypes": null,
                      "hexValue": "30",
                      "id": 9575,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "4303:1:36",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_0_by_1",
                        "typeString": "int_const 0"
                      },
                      "value": "0"
                    },
                    "nodeType": "VariableDeclarationStatement",
                    "src": "4293:11:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9582,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "4331:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9581,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9574,
                        "src": "4331:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9583,
                    "nodeType": "ExpressionStatement",
                    "src": "4331:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "4288:100:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 9598,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9595,
                            "name": "_addressList",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9566,
                            "src": "4406:12:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                              "typeString": "address[] memory"
                            }
                          },
                          "id": 9596,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "length",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "4406:19:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "+",
                        "rightExpression": {
                          "argumentTypes": null,
                          "hexValue": "31",
                          "id": 9597,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "4428:1:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_1_by_1",
                            "typeString": "int_const 1"
                          },
                          "value": "1"
                        },
                        "src": "4406:23:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "id": 9594,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "ElementaryTypeNameExpression",
                      "src": "4400:5:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_uint8_$",
                        "typeString": "type(uint8)"
                      },
                      "typeName": "uint8"
                    },
                    "id": 9599,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4400:30:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint8",
                      "typeString": "uint8"
                    }
                  },
                  "functionReturnParameters": 9572,
                  "id": 9600,
                  "nodeType": "Return",
                  "src": "4393:37:36"
                }
              ]
            },
            "documentation": null,
            "id": 9602,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "containsAddress",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9569,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9566,
                  "name": "_addressList",
                  "nodeType": "VariableDeclaration",
                  "scope": 9602,
                  "src": "4207:22:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                    "typeString": "address[]"
                  },
                  "typeName": {
                    "baseType": {
                      "id": 9564,
                      "name": "address",
                      "nodeType": "ElementaryTypeName",
                      "src": "4207:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "id": 9565,
                    "length": null,
                    "nodeType": "ArrayTypeName",
                    "src": "4207:9:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_address_$dyn_storage_ptr",
                      "typeString": "address[]"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 9568,
                  "name": "_addr",
                  "nodeType": "VariableDeclaration",
                  "scope": 9602,
                  "src": "4231:13:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9567,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "4231:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4206:39:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9572,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9571,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9602,
                  "src": "4275:5:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint8",
                    "typeString": "uint8"
                  },
                  "typeName": {
                    "id": 9570,
                    "name": "uint8",
                    "nodeType": "ElementaryTypeName",
                    "src": "4275:5:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint8",
                      "typeString": "uint8"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4274:7:36"
            },
            "scope": 9607,
            "src": "4182:253:36",
            "stateMutability": "pure",
            "superFunction": null,
            "visibility": "internal"
          },
          {
            "body": {
              "id": 9605,
              "nodeType": "Block",
              "src": "4470:2:36",
              "statements": []
            },
            "documentation": null,
            "id": 9606,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9603,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "4448:2:36"
            },
            "payable": true,
            "returnParameters": {
              "id": 9604,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "4470:0:36"
            },
            "scope": 9607,
            "src": "4439:33:36",
            "stateMutability": "payable",
            "superFunction": null,
            "visibility": "public"
          }
        ],
        "scope": 9608,
        "src": "712:3763:36"
      }
    ],
    "src": "0:4476:36"
  },
  "legacyAST": {
    "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/roles/AssetManagerFunds.sol",
    "exportedSymbols": {
      "AssetManagerFunds": [
        9607
      ],
      "DToken": [
        9023
      ]
    },
    "id": 9608,
    "nodeType": "SourceUnit",
    "nodes": [
      {
        "id": 8986,
        "literals": [
          "solidity",
          "0.4",
          ".24"
        ],
        "nodeType": "PragmaDirective",
        "src": "0:23:36"
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/ERC20.sol",
        "file": "../interfaces/ERC20.sol",
        "id": 8987,
        "nodeType": "ImportDirective",
        "scope": 9608,
        "sourceUnit": 6698,
        "src": "25:33:36",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/interfaces/DBInterface.sol",
        "file": "../interfaces/DBInterface.sol",
        "id": 8988,
        "nodeType": "ImportDirective",
        "scope": 9608,
        "sourceUnit": 6502,
        "src": "59:39:36",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "absolutePath": "/home/peter/Documents/Work/MyBit/MyBit-Network.tech/contracts/math/SafeMath.sol",
        "file": "../math/SafeMath.sol",
        "id": 8989,
        "nodeType": "ImportDirective",
        "scope": 9608,
        "sourceUnit": 6934,
        "src": "99:30:36",
        "symbolAliases": [],
        "unitAlias": ""
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "interface",
        "documentation": null,
        "fullyImplemented": false,
        "id": 9023,
        "linearizedBaseContracts": [
          9023
        ],
        "name": "DToken",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "body": null,
            "documentation": null,
            "id": 8994,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "withdraw",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 8990,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "169:2:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 8993,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 8992,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 8994,
                  "src": "190:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 8991,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "190:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "189:6:36"
            },
            "scope": 9023,
            "src": "152:44:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9001,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "getAmountOwed",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 8997,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 8996,
                  "name": "_user",
                  "nodeType": "VariableDeclaration",
                  "scope": 9001,
                  "src": "222:13:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 8995,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "222:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "221:15:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9000,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 8999,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9001,
                  "src": "260:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 8998,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "260:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "259:6:36"
            },
            "scope": 9023,
            "src": "199:67:36",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9008,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "balanceOf",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9004,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9003,
                  "name": "_tokenHolder",
                  "nodeType": "VariableDeclaration",
                  "scope": 9008,
                  "src": "288:20:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9002,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "288:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "287:22:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9007,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9006,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9008,
                  "src": "333:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 9005,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "333:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "332:6:36"
            },
            "scope": 9023,
            "src": "269:70:36",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9017,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "transfer",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9013,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9010,
                  "name": "_to",
                  "nodeType": "VariableDeclaration",
                  "scope": 9017,
                  "src": "360:11:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9009,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "360:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 9012,
                  "name": "_amount",
                  "nodeType": "VariableDeclaration",
                  "scope": 9017,
                  "src": "373:12:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint256",
                    "typeString": "uint256"
                  },
                  "typeName": {
                    "id": 9011,
                    "name": "uint",
                    "nodeType": "ElementaryTypeName",
                    "src": "373:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "359:27:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9016,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9015,
                  "name": "success",
                  "nodeType": "VariableDeclaration",
                  "scope": 9017,
                  "src": "405:12:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9014,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "405:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "404:14:36"
            },
            "scope": 9023,
            "src": "342:77:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": null,
            "documentation": null,
            "id": 9022,
            "implemented": false,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "getERC20",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9018,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "439:2:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9021,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9020,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9022,
                  "src": "466:7:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9019,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "466:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "465:9:36"
            },
            "scope": 9023,
            "src": "422:53:36",
            "stateMutability": "view",
            "superFunction": null,
            "visibility": "external"
          }
        ],
        "scope": 9608,
        "src": "131:346:36"
      },
      {
        "baseContracts": [],
        "contractDependencies": [],
        "contractKind": "contract",
        "documentation": null,
        "fullyImplemented": true,
        "id": 9607,
        "linearizedBaseContracts": [
          9607
        ],
        "name": "AssetManagerFunds",
        "nodeType": "ContractDefinition",
        "nodes": [
          {
            "id": 9026,
            "libraryName": {
              "contractScope": null,
              "id": 9024,
              "name": "SafeMath",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6933,
              "src": "749:8:36",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_SafeMath_$6933",
                "typeString": "library SafeMath"
              }
            },
            "nodeType": "UsingForDirective",
            "src": "743:27:36",
            "typeName": {
              "id": 9025,
              "name": "uint256",
              "nodeType": "ElementaryTypeName",
              "src": "762:7:36",
              "typeDescriptions": {
                "typeIdentifier": "t_uint256",
                "typeString": "uint256"
              }
            }
          },
          {
            "constant": false,
            "id": 9028,
            "name": "database",
            "nodeType": "VariableDeclaration",
            "scope": 9607,
            "src": "774:27:36",
            "stateVariable": true,
            "storageLocation": "default",
            "typeDescriptions": {
              "typeIdentifier": "t_contract$_DBInterface_$6501",
              "typeString": "contract DBInterface"
            },
            "typeName": {
              "contractScope": null,
              "id": 9027,
              "name": "DBInterface",
              "nodeType": "UserDefinedTypeName",
              "referencedDeclaration": 6501,
              "src": "774:11:36",
              "typeDescriptions": {
                "typeIdentifier": "t_contract$_DBInterface_$6501",
                "typeString": "contract DBInterface"
              }
            },
            "value": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 9039,
              "nodeType": "Block",
              "src": "846:44:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "id": 9037,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftHandSide": {
                      "argumentTypes": null,
                      "id": 9033,
                      "name": "database",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9028,
                      "src": "852:8:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DBInterface_$6501",
                        "typeString": "contract DBInterface"
                      }
                    },
                    "nodeType": "Assignment",
                    "operator": "=",
                    "rightHandSide": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "id": 9035,
                          "name": "_database",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9030,
                          "src": "875:9:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        ],
                        "id": 9034,
                        "name": "DBInterface",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 6501,
                        "src": "863:11:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_type$_t_contract$_DBInterface_$6501_$",
                          "typeString": "type(contract DBInterface)"
                        }
                      },
                      "id": 9036,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "typeConversion",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "863:22:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DBInterface_$6501",
                        "typeString": "contract DBInterface"
                      }
                    },
                    "src": "852:33:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_DBInterface_$6501",
                      "typeString": "contract DBInterface"
                    }
                  },
                  "id": 9038,
                  "nodeType": "ExpressionStatement",
                  "src": "852:33:36"
                }
              ]
            },
            "documentation": null,
            "id": 9040,
            "implemented": true,
            "isConstructor": true,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9031,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9030,
                  "name": "_database",
                  "nodeType": "VariableDeclaration",
                  "scope": 9040,
                  "src": "818:17:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9029,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "818:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "817:19:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9032,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "846:0:36"
            },
            "scope": 9607,
            "src": "806:84:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "public"
          },
          {
            "body": {
              "id": 9210,
              "nodeType": "Block",
              "src": "958:1001:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "id": 9060,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9048,
                            "name": "msg",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 13268,
                            "src": "972:3:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_magic_message",
                              "typeString": "msg"
                            }
                          },
                          "id": 9049,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "sender",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "972:10:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "==",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "hexValue": "61737365744d616e61676572",
                                      "id": 9055,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": true,
                                      "kind": "string",
                                      "lValueRequested": false,
                                      "nodeType": "Literal",
                                      "src": "1037:14:36",
                                      "subdenomination": null,
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                        "typeString": "literal_string \"assetManager\""
                                      },
                                      "value": "assetManager"
                                    },
                                    {
                                      "argumentTypes": null,
                                      "id": 9056,
                                      "name": "_assetID",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 9042,
                                      "src": "1053:8:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                        "typeString": "literal_string \"assetManager\""
                                      },
                                      {
                                        "typeIdentifier": "t_bytes32",
                                        "typeString": "bytes32"
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": null,
                                      "id": 9053,
                                      "name": "abi",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13255,
                                      "src": "1020:3:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_magic_abi",
                                        "typeString": "abi"
                                      }
                                    },
                                    "id": 9054,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "memberName": "encodePacked",
                                    "nodeType": "MemberAccess",
                                    "referencedDeclaration": null,
                                    "src": "1020:16:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                      "typeString": "function () pure returns (bytes memory)"
                                    }
                                  },
                                  "id": 9057,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "1020:42:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes_memory_ptr",
                                    "typeString": "bytes memory"
                                  }
                                ],
                                "id": 9052,
                                "name": "keccak256",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13262,
                                "src": "1010:9:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                  "typeString": "function () pure returns (bytes32)"
                                }
                              },
                              "id": 9058,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1010:53:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bytes32",
                                "typeString": "bytes32"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9050,
                              "name": "database",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9028,
                              "src": "986:8:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DBInterface_$6501",
                                "typeString": "contract DBInterface"
                              }
                            },
                            "id": 9051,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "addressStorage",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6472,
                            "src": "986:23:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                              "typeString": "function (bytes32) view external returns (address)"
                            }
                          },
                          "id": 9059,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "986:78:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "src": "972:92:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9047,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "964:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9061,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "964:101:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9062,
                  "nodeType": "ExpressionStatement",
                  "src": "964:101:36"
                },
                {
                  "assignments": [
                    9064
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9064,
                      "name": "token",
                      "nodeType": "VariableDeclaration",
                      "scope": 9211,
                      "src": "1071:12:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_contract$_DToken_$9023",
                        "typeString": "contract DToken"
                      },
                      "typeName": {
                        "contractScope": null,
                        "id": 9063,
                        "name": "DToken",
                        "nodeType": "UserDefinedTypeName",
                        "referencedDeclaration": 9023,
                        "src": "1071:6:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_contract$_DToken_$9023",
                          "typeString": "contract DToken"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9077,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "arguments": [
                          {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "746f6b656e41646472657373",
                                    "id": 9071,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "string",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "1144:14:36",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    "value": "tokenAddress"
                                  },
                                  {
                                    "argumentTypes": null,
                                    "id": 9072,
                                    "name": "_assetID",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9042,
                                    "src": "1160:8:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                      "typeString": "literal_string \"tokenAddress\""
                                    },
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9069,
                                    "name": "abi",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13255,
                                    "src": "1127:3:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_abi",
                                      "typeString": "abi"
                                    }
                                  },
                                  "id": 9070,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "memberName": "encodePacked",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "1127:16:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                    "typeString": "function () pure returns (bytes memory)"
                                  }
                                },
                                "id": 9073,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1127:42:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_bytes_memory_ptr",
                                  "typeString": "bytes memory"
                                }
                              ],
                              "id": 9068,
                              "name": "keccak256",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 13262,
                              "src": "1117:9:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                "typeString": "function () pure returns (bytes32)"
                              }
                            },
                            "id": 9074,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1117:53:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          }
                        ],
                        "expression": {
                          "argumentTypes": [
                            {
                              "typeIdentifier": "t_bytes32",
                              "typeString": "bytes32"
                            }
                          ],
                          "expression": {
                            "argumentTypes": null,
                            "id": 9066,
                            "name": "database",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9028,
                            "src": "1093:8:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DBInterface_$6501",
                              "typeString": "contract DBInterface"
                            }
                          },
                          "id": 9067,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "addressStorage",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": 6472,
                          "src": "1093:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                            "typeString": "function (bytes32) view external returns (address)"
                          }
                        },
                        "id": 9075,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "kind": "functionCall",
                        "lValueRequested": false,
                        "names": [],
                        "nodeType": "FunctionCall",
                        "src": "1093:78:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      ],
                      "id": 9065,
                      "name": "DToken",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9023,
                      "src": "1086:6:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                        "typeString": "type(contract DToken)"
                      }
                    },
                    "id": 9076,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1086:86:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_contract$_DToken_$9023",
                      "typeString": "contract DToken"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1071:101:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        },
                        "id": 9085,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9080,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9064,
                              "src": "1194:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            ],
                            "id": 9079,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "lValueRequested": false,
                            "nodeType": "ElementaryTypeNameExpression",
                            "src": "1186:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_address_$",
                              "typeString": "type(address)"
                            },
                            "typeName": "address"
                          },
                          "id": 9081,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1186:14:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "!=",
                        "rightExpression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "hexValue": "30",
                              "id": 9083,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "kind": "number",
                              "lValueRequested": false,
                              "nodeType": "Literal",
                              "src": "1212:1:36",
                              "subdenomination": null,
                              "typeDescriptions": {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              },
                              "value": "0"
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_rational_0_by_1",
                                "typeString": "int_const 0"
                              }
                            ],
                            "id": 9082,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": true,
                            "lValueRequested": false,
                            "nodeType": "ElementaryTypeNameExpression",
                            "src": "1204:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_address_$",
                              "typeString": "type(address)"
                            },
                            "typeName": "address"
                          },
                          "id": 9084,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1204:10:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "src": "1186:28:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9078,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "1178:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9086,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "1178:37:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9087,
                  "nodeType": "ExpressionStatement",
                  "src": "1178:37:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9089,
                      "name": "amountOwed",
                      "nodeType": "VariableDeclaration",
                      "scope": 9211,
                      "src": "1221:15:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 9088,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "1221:4:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9090,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1221:15:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9092,
                      "name": "balanceBefore",
                      "nodeType": "VariableDeclaration",
                      "scope": 9211,
                      "src": "1242:18:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 9091,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "1242:4:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9093,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "1242:18:36"
                },
                {
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    },
                    "id": 9100,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "arguments": [],
                      "expression": {
                        "argumentTypes": [],
                        "expression": {
                          "argumentTypes": null,
                          "id": 9094,
                          "name": "token",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9064,
                          "src": "1270:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "id": 9095,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "getERC20",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": 9022,
                        "src": "1270:14:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_function_external_view$__$returns$_t_address_$",
                          "typeString": "function () view external returns (address)"
                        }
                      },
                      "id": 9096,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "kind": "functionCall",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "1270:16:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "==",
                    "rightExpression": {
                      "argumentTypes": null,
                      "arguments": [
                        {
                          "argumentTypes": null,
                          "hexValue": "30",
                          "id": 9098,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "1298:1:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_0_by_1",
                            "typeString": "int_const 0"
                          },
                          "value": "0"
                        }
                      ],
                      "expression": {
                        "argumentTypes": [
                          {
                            "typeIdentifier": "t_rational_0_by_1",
                            "typeString": "int_const 0"
                          }
                        ],
                        "id": 9097,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "lValueRequested": false,
                        "nodeType": "ElementaryTypeNameExpression",
                        "src": "1290:7:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_type$_t_address_$",
                          "typeString": "type(address)"
                        },
                        "typeName": "address"
                      },
                      "id": 9099,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "typeConversion",
                      "lValueRequested": false,
                      "names": [],
                      "nodeType": "FunctionCall",
                      "src": "1290:10:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "src": "1270:30:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "falseBody": {
                    "id": 9206,
                    "nodeType": "Block",
                    "src": "1632:306:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9161,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9154,
                            "name": "amountOwed",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9089,
                            "src": "1640:10:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9158,
                                    "name": "this",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13383,
                                    "src": "1681:4:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  ],
                                  "id": 9157,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "1673:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9159,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1673:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9155,
                                "name": "token",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9064,
                                "src": "1653:5:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_DToken_$9023",
                                  "typeString": "contract DToken"
                                }
                              },
                              "id": 9156,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "getAmountOwed",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 9001,
                              "src": "1653:19:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                "typeString": "function (address) view external returns (uint256)"
                              }
                            },
                            "id": 9160,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1653:34:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1640:47:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9162,
                        "nodeType": "ExpressionStatement",
                        "src": "1640:47:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9166,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9164,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9089,
                                "src": "1703:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9165,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "1716:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "1703:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9163,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1695:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9167,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1695:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9168,
                        "nodeType": "ExpressionStatement",
                        "src": "1695:23:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9176,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9169,
                            "name": "balanceBefore",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9092,
                            "src": "1726:13:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9173,
                                    "name": "this",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13383,
                                    "src": "1766:4:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  ],
                                  "id": 9172,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "1758:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9174,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1758:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9170,
                                "name": "token",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9064,
                                "src": "1742:5:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_DToken_$9023",
                                  "typeString": "contract DToken"
                                }
                              },
                              "id": 9171,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "balanceOf",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 9008,
                              "src": "1742:15:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                "typeString": "function (address) view external returns (uint256)"
                              }
                            },
                            "id": 9175,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1742:30:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1726:46:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9177,
                        "nodeType": "ExpressionStatement",
                        "src": "1726:46:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9179,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9064,
                                  "src": "1788:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9180,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "1788:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9181,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1788:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9178,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1780:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9182,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1780:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9183,
                        "nodeType": "ExpressionStatement",
                        "src": "1780:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9195,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9192,
                                    "name": "amountOwed",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9089,
                                    "src": "1856:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "id": 9188,
                                            "name": "this",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13383,
                                            "src": "1845:4:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          ],
                                          "id": 9187,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "nodeType": "ElementaryTypeNameExpression",
                                          "src": "1837:7:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_type$_t_address_$",
                                            "typeString": "type(address)"
                                          },
                                          "typeName": "address"
                                        },
                                        "id": 9189,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "typeConversion",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "1837:13:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": null,
                                        "id": 9185,
                                        "name": "token",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9064,
                                        "src": "1821:5:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_contract$_DToken_$9023",
                                          "typeString": "contract DToken"
                                        }
                                      },
                                      "id": 9186,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "memberName": "balanceOf",
                                      "nodeType": "MemberAccess",
                                      "referencedDeclaration": 9008,
                                      "src": "1821:15:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                        "typeString": "function (address) view external returns (uint256)"
                                      }
                                    },
                                    "id": 9190,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "1821:30:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  },
                                  "id": 9191,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "sub",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6890,
                                  "src": "1821:34:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                    "typeString": "function (uint256,uint256) pure returns (uint256)"
                                  }
                                },
                                "id": 9193,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1821:46:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9194,
                                "name": "balanceBefore",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9092,
                                "src": "1871:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "1821:63:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9184,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1813:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9196,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1813:72:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9197,
                        "nodeType": "ExpressionStatement",
                        "src": "1813:72:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "expression": {
                                "argumentTypes": null,
                                "id": 9201,
                                "name": "msg",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13268,
                                "src": "1908:3:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_message",
                                  "typeString": "msg"
                                }
                              },
                              "id": 9202,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "sender",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "1908:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            },
                            {
                              "argumentTypes": null,
                              "id": 9203,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9089,
                              "src": "1920:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9198,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9064,
                              "src": "1893:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9200,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "transfer",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9017,
                            "src": "1893:14:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_nonpayable$_t_address_$_t_uint256_$returns$_t_bool_$",
                              "typeString": "function (address,uint256) external returns (bool)"
                            }
                          },
                          "id": 9204,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1893:38:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_bool",
                            "typeString": "bool"
                          }
                        },
                        "id": 9205,
                        "nodeType": "ExpressionStatement",
                        "src": "1893:38:36"
                      }
                    ]
                  },
                  "id": 9207,
                  "nodeType": "IfStatement",
                  "src": "1266:672:36",
                  "trueBody": {
                    "id": 9153,
                    "nodeType": "Block",
                    "src": "1301:321:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9106,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9101,
                            "name": "balanceBefore",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9092,
                            "src": "1309:13:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9103,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "1333:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9102,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "1325:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9104,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1325:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            },
                            "id": 9105,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "balance",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1325:21:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1309:37:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9107,
                        "nodeType": "ExpressionStatement",
                        "src": "1309:37:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9115,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9108,
                            "name": "amountOwed",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9089,
                            "src": "1354:10:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9112,
                                    "name": "this",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13383,
                                    "src": "1395:4:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                      "typeString": "contract AssetManagerFunds"
                                    }
                                  ],
                                  "id": 9111,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "1387:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9113,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "1387:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9109,
                                "name": "token",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9064,
                                "src": "1367:5:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_DToken_$9023",
                                  "typeString": "contract DToken"
                                }
                              },
                              "id": 9110,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "getAmountOwed",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 9001,
                              "src": "1367:19:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                "typeString": "function (address) view external returns (uint256)"
                              }
                            },
                            "id": 9114,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "1367:34:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "1354:47:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9116,
                        "nodeType": "ExpressionStatement",
                        "src": "1354:47:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9120,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9118,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9089,
                                "src": "1417:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9119,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "1430:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "1417:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9117,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1409:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9121,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1409:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9122,
                        "nodeType": "ExpressionStatement",
                        "src": "1409:23:36"
                      },
                      {
                        "assignments": [
                          9124
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9124,
                            "name": "balanceAfter",
                            "nodeType": "VariableDeclaration",
                            "scope": 9211,
                            "src": "1440:17:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9123,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "1440:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9129,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9127,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9089,
                              "src": "1478:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9125,
                              "name": "balanceBefore",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9092,
                              "src": "1460:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 9126,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "add",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6914,
                            "src": "1460:17:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 9128,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1460:29:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "1440:49:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9131,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9064,
                                  "src": "1505:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9132,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "1505:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9133,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "1505:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9130,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1497:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9134,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1497:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9135,
                        "nodeType": "ExpressionStatement",
                        "src": "1497:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9142,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9138,
                                      "name": "this",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13383,
                                      "src": "1546:4:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    ],
                                    "id": 9137,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "nodeType": "ElementaryTypeNameExpression",
                                    "src": "1538:7:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_address_$",
                                      "typeString": "type(address)"
                                    },
                                    "typeName": "address"
                                  },
                                  "id": 9139,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "1538:13:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "id": 9140,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "balance",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "1538:21:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9141,
                                "name": "balanceAfter",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9124,
                                "src": "1563:12:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "1538:37:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9136,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "1530:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9143,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1530:46:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9144,
                        "nodeType": "ExpressionStatement",
                        "src": "1530:46:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9150,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9089,
                              "src": "1604:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "expression": {
                                "argumentTypes": null,
                                "id": 9145,
                                "name": "msg",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13268,
                                "src": "1584:3:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_magic_message",
                                  "typeString": "msg"
                                }
                              },
                              "id": 9148,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "sender",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": null,
                              "src": "1584:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            },
                            "id": 9149,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "transfer",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "1584:19:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_transfer_nonpayable$_t_uint256_$returns$__$",
                              "typeString": "function (uint256)"
                            }
                          },
                          "id": 9151,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "1584:31:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9152,
                        "nodeType": "ExpressionStatement",
                        "src": "1584:31:36"
                      }
                    ]
                  }
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 9208,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "1950:4:36",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 9046,
                  "id": 9209,
                  "nodeType": "Return",
                  "src": "1943:11:36"
                }
              ]
            },
            "documentation": null,
            "id": 9211,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "withdraw",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9043,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9042,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 9211,
                  "src": "912:16:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bytes32",
                    "typeString": "bytes32"
                  },
                  "typeName": {
                    "id": 9041,
                    "name": "bytes32",
                    "nodeType": "ElementaryTypeName",
                    "src": "912:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bytes32",
                      "typeString": "bytes32"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "911:18:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9046,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9045,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9211,
                  "src": "952:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9044,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "952:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "951:6:36"
            },
            "scope": 9607,
            "src": "894:1065:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 9434,
              "nodeType": "Block",
              "src": "2047:1332:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 9223,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9220,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9214,
                            "src": "2061:8:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                              "typeString": "bytes32[] calldata"
                            }
                          },
                          "id": 9221,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "length",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "2061:15:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<",
                        "rightExpression": {
                          "argumentTypes": null,
                          "hexValue": "3530",
                          "id": 9222,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "2079:2:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_50_by_1",
                            "typeString": "int_const 50"
                          },
                          "value": "50"
                        },
                        "src": "2061:20:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9219,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "2053:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9224,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2053:29:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9225,
                  "nodeType": "ExpressionStatement",
                  "src": "2053:29:36"
                },
                {
                  "assignments": [
                    9229
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9229,
                      "name": "payoutAmounts",
                      "nodeType": "VariableDeclaration",
                      "scope": 9435,
                      "src": "2088:27:36",
                      "stateVariable": false,
                      "storageLocation": "memory",
                      "typeDescriptions": {
                        "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                        "typeString": "uint256[]"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9227,
                          "name": "uint",
                          "nodeType": "ElementaryTypeName",
                          "src": "2088:4:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9228,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2088:6:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_uint256_$dyn_storage_ptr",
                          "typeString": "uint256[]"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9236,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "expression": {
                          "argumentTypes": null,
                          "id": 9233,
                          "name": "_assetID",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9214,
                          "src": "2129:8:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                            "typeString": "bytes32[] calldata"
                          }
                        },
                        "id": 9234,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "length",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": null,
                        "src": "2129:15:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "id": 9232,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "NewExpression",
                      "src": "2118:10:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_objectcreation_pure$_t_uint256_$returns$_t_array$_t_uint256_$dyn_memory_$",
                        "typeString": "function (uint256) pure returns (uint256[] memory)"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9230,
                          "name": "uint",
                          "nodeType": "ElementaryTypeName",
                          "src": "2122:4:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9231,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2122:6:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_uint256_$dyn_storage_ptr",
                          "typeString": "uint256[]"
                        }
                      }
                    },
                    "id": 9235,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2118:27:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory",
                      "typeString": "uint256[] memory"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2088:57:36"
                },
                {
                  "assignments": [
                    9240
                  ],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9240,
                      "name": "tokenAddresses",
                      "nodeType": "VariableDeclaration",
                      "scope": 9435,
                      "src": "2151:31:36",
                      "stateVariable": false,
                      "storageLocation": "memory",
                      "typeDescriptions": {
                        "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                        "typeString": "address[]"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9238,
                          "name": "address",
                          "nodeType": "ElementaryTypeName",
                          "src": "2151:7:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "id": 9239,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2151:9:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_address_$dyn_storage_ptr",
                          "typeString": "address[]"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9247,
                  "initialValue": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "expression": {
                          "argumentTypes": null,
                          "id": 9244,
                          "name": "_assetID",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 9214,
                          "src": "2199:8:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                            "typeString": "bytes32[] calldata"
                          }
                        },
                        "id": 9245,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "length",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": null,
                        "src": "2199:15:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "id": 9243,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "NewExpression",
                      "src": "2185:13:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_objectcreation_pure$_t_uint256_$returns$_t_array$_t_address_$dyn_memory_$",
                        "typeString": "function (uint256) pure returns (address[] memory)"
                      },
                      "typeName": {
                        "baseType": {
                          "id": 9241,
                          "name": "address",
                          "nodeType": "ElementaryTypeName",
                          "src": "2189:7:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          }
                        },
                        "id": 9242,
                        "length": null,
                        "nodeType": "ArrayTypeName",
                        "src": "2189:9:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_address_$dyn_storage_ptr",
                          "typeString": "address[]"
                        }
                      }
                    },
                    "id": 9246,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "2185:30:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_address_$dyn_memory",
                      "typeString": "address[] memory"
                    }
                  },
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2151:64:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9249,
                      "name": "numEntries",
                      "nodeType": "VariableDeclaration",
                      "scope": 9435,
                      "src": "2221:16:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      },
                      "typeName": {
                        "id": 9248,
                        "name": "uint8",
                        "nodeType": "ElementaryTypeName",
                        "src": "2221:5:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9250,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "2221:16:36"
                },
                {
                  "body": {
                    "id": 9403,
                    "nodeType": "Block",
                    "src": "2285:949:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              "id": 9277,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9263,
                                  "name": "msg",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13268,
                                  "src": "2301:3:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_magic_message",
                                    "typeString": "msg"
                                  }
                                },
                                "id": 9264,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "sender",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "2301:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "hexValue": "61737365744d616e61676572",
                                            "id": 9270,
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": true,
                                            "kind": "string",
                                            "lValueRequested": false,
                                            "nodeType": "Literal",
                                            "src": "2366:14:36",
                                            "subdenomination": null,
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            "value": "assetManager"
                                          },
                                          {
                                            "argumentTypes": null,
                                            "baseExpression": {
                                              "argumentTypes": null,
                                              "id": 9271,
                                              "name": "_assetID",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9214,
                                              "src": "2382:8:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                                "typeString": "bytes32[] calldata"
                                              }
                                            },
                                            "id": 9273,
                                            "indexExpression": {
                                              "argumentTypes": null,
                                              "id": 9272,
                                              "name": "i",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9252,
                                              "src": "2391:1:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_uint8",
                                                "typeString": "uint8"
                                              }
                                            },
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": false,
                                            "lValueRequested": false,
                                            "nodeType": "IndexAccess",
                                            "src": "2382:11:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          ],
                                          "expression": {
                                            "argumentTypes": null,
                                            "id": 9268,
                                            "name": "abi",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13255,
                                            "src": "2349:3:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_magic_abi",
                                              "typeString": "abi"
                                            }
                                          },
                                          "id": 9269,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "memberName": "encodePacked",
                                          "nodeType": "MemberAccess",
                                          "referencedDeclaration": null,
                                          "src": "2349:16:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                            "typeString": "function () pure returns (bytes memory)"
                                          }
                                        },
                                        "id": 9274,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "functionCall",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "2349:45:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      ],
                                      "id": 9267,
                                      "name": "keccak256",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13262,
                                      "src": "2339:9:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                        "typeString": "function () pure returns (bytes32)"
                                      }
                                    },
                                    "id": 9275,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "2339:56:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9265,
                                    "name": "database",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9028,
                                    "src": "2315:8:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_DBInterface_$6501",
                                      "typeString": "contract DBInterface"
                                    }
                                  },
                                  "id": 9266,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "addressStorage",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6472,
                                  "src": "2315:23:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                    "typeString": "function (bytes32) view external returns (address)"
                                  }
                                },
                                "id": 9276,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "2315:81:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "src": "2301:95:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9262,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "2293:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9278,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2293:105:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9279,
                        "nodeType": "ExpressionStatement",
                        "src": "2293:105:36"
                      },
                      {
                        "assignments": [
                          9281
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9281,
                            "name": "token",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2406:12:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DToken_$9023",
                              "typeString": "contract DToken"
                            },
                            "typeName": {
                              "contractScope": null,
                              "id": 9280,
                              "name": "DToken",
                              "nodeType": "UserDefinedTypeName",
                              "referencedDeclaration": 9023,
                              "src": "2406:6:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9296,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "arguments": [
                                        {
                                          "argumentTypes": null,
                                          "hexValue": "746f6b656e41646472657373",
                                          "id": 9288,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "kind": "string",
                                          "lValueRequested": false,
                                          "nodeType": "Literal",
                                          "src": "2479:14:36",
                                          "subdenomination": null,
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          "value": "tokenAddress"
                                        },
                                        {
                                          "argumentTypes": null,
                                          "baseExpression": {
                                            "argumentTypes": null,
                                            "id": 9289,
                                            "name": "_assetID",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9214,
                                            "src": "2495:8:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                              "typeString": "bytes32[] calldata"
                                            }
                                          },
                                          "id": 9291,
                                          "indexExpression": {
                                            "argumentTypes": null,
                                            "id": 9290,
                                            "name": "i",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9252,
                                            "src": "2504:1:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_uint8",
                                              "typeString": "uint8"
                                            }
                                          },
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": false,
                                          "lValueRequested": false,
                                          "nodeType": "IndexAccess",
                                          "src": "2495:11:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": [
                                          {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": null,
                                          "id": 9286,
                                          "name": "abi",
                                          "nodeType": "Identifier",
                                          "overloadedDeclarations": [],
                                          "referencedDeclaration": 13255,
                                          "src": "2462:3:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_magic_abi",
                                            "typeString": "abi"
                                          }
                                        },
                                        "id": 9287,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": true,
                                        "lValueRequested": false,
                                        "memberName": "encodePacked",
                                        "nodeType": "MemberAccess",
                                        "referencedDeclaration": null,
                                        "src": "2462:16:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                          "typeString": "function () pure returns (bytes memory)"
                                        }
                                      },
                                      "id": 9292,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "kind": "functionCall",
                                      "lValueRequested": false,
                                      "names": [],
                                      "nodeType": "FunctionCall",
                                      "src": "2462:45:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    ],
                                    "id": 9285,
                                    "name": "keccak256",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13262,
                                    "src": "2452:9:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                      "typeString": "function () pure returns (bytes32)"
                                    }
                                  },
                                  "id": 9293,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "2452:56:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9283,
                                  "name": "database",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9028,
                                  "src": "2428:8:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DBInterface_$6501",
                                    "typeString": "contract DBInterface"
                                  }
                                },
                                "id": 9284,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "addressStorage",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6472,
                                "src": "2428:23:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                  "typeString": "function (bytes32) view external returns (address)"
                                }
                              },
                              "id": 9294,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2428:81:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9282,
                            "name": "DToken",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9023,
                            "src": "2421:6:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                              "typeString": "type(contract DToken)"
                            }
                          },
                          "id": 9295,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2421:89:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2406:104:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              "id": 9304,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9299,
                                    "name": "token",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9281,
                                    "src": "2534:5:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_DToken_$9023",
                                      "typeString": "contract DToken"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_contract$_DToken_$9023",
                                      "typeString": "contract DToken"
                                    }
                                  ],
                                  "id": 9298,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "2526:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9300,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "2526:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "!=",
                              "rightExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "hexValue": "30",
                                    "id": 9302,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "kind": "number",
                                    "lValueRequested": false,
                                    "nodeType": "Literal",
                                    "src": "2552:1:36",
                                    "subdenomination": null,
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_rational_0_by_1",
                                      "typeString": "int_const 0"
                                    },
                                    "value": "0"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_rational_0_by_1",
                                      "typeString": "int_const 0"
                                    }
                                  ],
                                  "id": 9301,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": true,
                                  "lValueRequested": false,
                                  "nodeType": "ElementaryTypeNameExpression",
                                  "src": "2544:7:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_type$_t_address_$",
                                    "typeString": "type(address)"
                                  },
                                  "typeName": "address"
                                },
                                "id": 9303,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "typeConversion",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "2544:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "src": "2526:28:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9297,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "2518:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9305,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2518:37:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9306,
                        "nodeType": "ExpressionStatement",
                        "src": "2518:37:36"
                      },
                      {
                        "assignments": [
                          9308
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9308,
                            "name": "tokensOwed",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2563:15:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9307,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "2563:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9315,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9312,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "2609:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9311,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "2601:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9313,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2601:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9309,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9281,
                              "src": "2581:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9310,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "getAmountOwed",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9001,
                            "src": "2581:19:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                              "typeString": "function (address) view external returns (uint256)"
                            }
                          },
                          "id": 9314,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2581:34:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2563:52:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9319,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9317,
                                "name": "tokensOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9308,
                                "src": "2631:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9318,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "2644:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "2631:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9316,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "2623:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9320,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2623:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9321,
                        "nodeType": "ExpressionStatement",
                        "src": "2623:23:36"
                      },
                      {
                        "assignments": [
                          9323
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9323,
                            "name": "fundingToken",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2654:19:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DToken_$9023",
                              "typeString": "contract DToken"
                            },
                            "typeName": {
                              "contractScope": null,
                              "id": 9322,
                              "name": "DToken",
                              "nodeType": "UserDefinedTypeName",
                              "referencedDeclaration": 9023,
                              "src": "2654:6:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9329,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9325,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9281,
                                  "src": "2683:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9326,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "getERC20",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 9022,
                                "src": "2683:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$__$returns$_t_address_$",
                                  "typeString": "function () view external returns (address)"
                                }
                              },
                              "id": 9327,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2683:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9324,
                            "name": "DToken",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9023,
                            "src": "2676:6:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                              "typeString": "type(contract DToken)"
                            }
                          },
                          "id": 9328,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2676:24:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2654:46:36"
                      },
                      {
                        "assignments": [
                          9331
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9331,
                            "name": "balanceBefore",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2708:18:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9330,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "2708:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9338,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9335,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "2760:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9334,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "2752:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9336,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2752:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9332,
                              "name": "fundingToken",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9323,
                              "src": "2729:12:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9333,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "balanceOf",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9008,
                            "src": "2729:22:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                              "typeString": "function (address) view external returns (uint256)"
                            }
                          },
                          "id": 9337,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2729:37:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2708:58:36"
                      },
                      {
                        "assignments": [
                          9340
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9340,
                            "name": "tokenIndex",
                            "nodeType": "VariableDeclaration",
                            "scope": 9435,
                            "src": "2774:16:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint8",
                              "typeString": "uint8"
                            },
                            "typeName": {
                              "id": 9339,
                              "name": "uint8",
                              "nodeType": "ElementaryTypeName",
                              "src": "2774:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint8",
                                "typeString": "uint8"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9347,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9342,
                              "name": "tokenAddresses",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9240,
                              "src": "2809:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                "typeString": "address[] memory"
                              }
                            },
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9344,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9281,
                                  "src": "2833:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                ],
                                "id": 9343,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "2825:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9345,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "2825:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                "typeString": "address[] memory"
                              },
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9341,
                            "name": "containsAddress",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9602,
                            "src": "2793:15:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_array$_t_address_$dyn_memory_ptr_$_t_address_$returns$_t_uint8_$",
                              "typeString": "function (address[] memory,address) pure returns (uint8)"
                            }
                          },
                          "id": 9346,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "2793:47:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "2774:66:36"
                      },
                      {
                        "condition": {
                          "argumentTypes": null,
                          "commonType": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          },
                          "id": 9351,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftExpression": {
                            "argumentTypes": null,
                            "id": 9348,
                            "name": "tokenIndex",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9340,
                            "src": "2852:10:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint8",
                              "typeString": "uint8"
                            }
                          },
                          "nodeType": "BinaryOperation",
                          "operator": "<",
                          "rightExpression": {
                            "argumentTypes": null,
                            "expression": {
                              "argumentTypes": null,
                              "id": 9349,
                              "name": "_assetID",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9214,
                              "src": "2865:8:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                "typeString": "bytes32[] calldata"
                              }
                            },
                            "id": 9350,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "length",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": null,
                            "src": "2865:15:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "2852:28:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_bool",
                            "typeString": "bool"
                          }
                        },
                        "falseBody": {
                          "id": 9381,
                          "nodeType": "Block",
                          "src": "2969:139:36",
                          "statements": [
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9370,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "leftHandSide": {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9364,
                                    "name": "tokenAddresses",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9240,
                                    "src": "2979:14:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                      "typeString": "address[] memory"
                                    }
                                  },
                                  "id": 9366,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9365,
                                    "name": "numEntries",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9249,
                                    "src": "2994:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": true,
                                  "nodeType": "IndexAccess",
                                  "src": "2979:26:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "nodeType": "Assignment",
                                "operator": "=",
                                "rightHandSide": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9368,
                                      "name": "fundingToken",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 9323,
                                      "src": "3016:12:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_contract$_DToken_$9023",
                                        "typeString": "contract DToken"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_contract$_DToken_$9023",
                                        "typeString": "contract DToken"
                                      }
                                    ],
                                    "id": 9367,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "nodeType": "ElementaryTypeNameExpression",
                                    "src": "3008:7:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_address_$",
                                      "typeString": "type(address)"
                                    },
                                    "typeName": "address"
                                  },
                                  "id": 9369,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "3008:21:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "src": "2979:50:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "id": 9371,
                              "nodeType": "ExpressionStatement",
                              "src": "2979:50:36"
                            },
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9376,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "leftHandSide": {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9372,
                                    "name": "payoutAmounts",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9229,
                                    "src": "3039:13:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                      "typeString": "uint256[] memory"
                                    }
                                  },
                                  "id": 9374,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9373,
                                    "name": "numEntries",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9249,
                                    "src": "3053:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": true,
                                  "nodeType": "IndexAccess",
                                  "src": "3039:25:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "nodeType": "Assignment",
                                "operator": "=",
                                "rightHandSide": {
                                  "argumentTypes": null,
                                  "id": 9375,
                                  "name": "tokensOwed",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9308,
                                  "src": "3067:10:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "src": "3039:38:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "id": 9377,
                              "nodeType": "ExpressionStatement",
                              "src": "3039:38:36"
                            },
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9379,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "nodeType": "UnaryOperation",
                                "operator": "++",
                                "prefix": false,
                                "src": "3087:12:36",
                                "subExpression": {
                                  "argumentTypes": null,
                                  "id": 9378,
                                  "name": "numEntries",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9249,
                                  "src": "3087:10:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint8",
                                    "typeString": "uint8"
                                  }
                                },
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint8",
                                  "typeString": "uint8"
                                }
                              },
                              "id": 9380,
                              "nodeType": "ExpressionStatement",
                              "src": "3087:12:36"
                            }
                          ]
                        },
                        "id": 9382,
                        "nodeType": "IfStatement",
                        "src": "2848:260:36",
                        "trueBody": {
                          "id": 9363,
                          "nodeType": "Block",
                          "src": "2882:75:36",
                          "statements": [
                            {
                              "expression": {
                                "argumentTypes": null,
                                "id": 9361,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "leftHandSide": {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9352,
                                    "name": "payoutAmounts",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9229,
                                    "src": "2885:13:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                      "typeString": "uint256[] memory"
                                    }
                                  },
                                  "id": 9354,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9353,
                                    "name": "tokenIndex",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9340,
                                    "src": "2899:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": true,
                                  "nodeType": "IndexAccess",
                                  "src": "2885:25:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "nodeType": "Assignment",
                                "operator": "=",
                                "rightHandSide": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9359,
                                      "name": "tokensOwed",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 9308,
                                      "src": "2943:10:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_uint256",
                                        "typeString": "uint256"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_uint256",
                                        "typeString": "uint256"
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": null,
                                      "baseExpression": {
                                        "argumentTypes": null,
                                        "id": 9355,
                                        "name": "payoutAmounts",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9229,
                                        "src": "2913:13:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                          "typeString": "uint256[] memory"
                                        }
                                      },
                                      "id": 9357,
                                      "indexExpression": {
                                        "argumentTypes": null,
                                        "id": 9356,
                                        "name": "tokenIndex",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9340,
                                        "src": "2927:10:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_uint8",
                                          "typeString": "uint8"
                                        }
                                      },
                                      "isConstant": false,
                                      "isLValue": true,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "nodeType": "IndexAccess",
                                      "src": "2913:25:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_uint256",
                                        "typeString": "uint256"
                                      }
                                    },
                                    "id": 9358,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "lValueRequested": false,
                                    "memberName": "add",
                                    "nodeType": "MemberAccess",
                                    "referencedDeclaration": 6914,
                                    "src": "2913:29:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                      "typeString": "function (uint256,uint256) pure returns (uint256)"
                                    }
                                  },
                                  "id": 9360,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "2913:41:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                },
                                "src": "2885:69:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "id": 9362,
                              "nodeType": "ExpressionStatement",
                              "src": "2885:69:36"
                            }
                          ]
                        }
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9384,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9281,
                                  "src": "3123:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9385,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "3123:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9386,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3123:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9383,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3115:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9387,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3115:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9388,
                        "nodeType": "ExpressionStatement",
                        "src": "3115:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9400,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "id": 9397,
                                    "name": "tokensOwed",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9308,
                                    "src": "3198:10:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "id": 9393,
                                            "name": "this",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13383,
                                            "src": "3187:4:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                              "typeString": "contract AssetManagerFunds"
                                            }
                                          ],
                                          "id": 9392,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "nodeType": "ElementaryTypeNameExpression",
                                          "src": "3179:7:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_type$_t_address_$",
                                            "typeString": "type(address)"
                                          },
                                          "typeName": "address"
                                        },
                                        "id": 9394,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "typeConversion",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "3179:13:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_address",
                                          "typeString": "address"
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": null,
                                        "id": 9390,
                                        "name": "fundingToken",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9323,
                                        "src": "3156:12:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_contract$_DToken_$9023",
                                          "typeString": "contract DToken"
                                        }
                                      },
                                      "id": 9391,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "memberName": "balanceOf",
                                      "nodeType": "MemberAccess",
                                      "referencedDeclaration": 9008,
                                      "src": "3156:22:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                                        "typeString": "function (address) view external returns (uint256)"
                                      }
                                    },
                                    "id": 9395,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "3156:37:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint256",
                                      "typeString": "uint256"
                                    }
                                  },
                                  "id": 9396,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "sub",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6890,
                                  "src": "3156:41:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                    "typeString": "function (uint256,uint256) pure returns (uint256)"
                                  }
                                },
                                "id": 9398,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "3156:53:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9399,
                                "name": "balanceBefore",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9331,
                                "src": "3213:13:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "3156:70:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9389,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3148:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9401,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3148:79:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9402,
                        "nodeType": "ExpressionStatement",
                        "src": "3148:79:36"
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 9258,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9255,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9252,
                      "src": "2260:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "expression": {
                        "argumentTypes": null,
                        "id": 9256,
                        "name": "_assetID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9214,
                        "src": "2264:8:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                          "typeString": "bytes32[] calldata"
                        }
                      },
                      "id": 9257,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "length",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "2264:15:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "src": "2260:19:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9404,
                  "initializationExpression": {
                    "assignments": [
                      9252
                    ],
                    "declarations": [
                      {
                        "constant": false,
                        "id": 9252,
                        "name": "i",
                        "nodeType": "VariableDeclaration",
                        "scope": 9435,
                        "src": "2247:7:36",
                        "stateVariable": false,
                        "storageLocation": "default",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        },
                        "typeName": {
                          "id": 9251,
                          "name": "uint8",
                          "nodeType": "ElementaryTypeName",
                          "src": "2247:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "value": null,
                        "visibility": "internal"
                      }
                    ],
                    "id": 9254,
                    "initialValue": {
                      "argumentTypes": null,
                      "hexValue": "30",
                      "id": 9253,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "2257:1:36",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_0_by_1",
                        "typeString": "int_const 0"
                      },
                      "value": "0"
                    },
                    "nodeType": "VariableDeclarationStatement",
                    "src": "2247:11:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9260,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "2281:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9259,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9252,
                        "src": "2281:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9261,
                    "nodeType": "ExpressionStatement",
                    "src": "2281:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "2243:991:36"
                },
                {
                  "body": {
                    "id": 9430,
                    "nodeType": "Block",
                    "src": "3271:87:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9422,
                                    "name": "msg",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13268,
                                    "src": "3321:3:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_magic_message",
                                      "typeString": "msg"
                                    }
                                  },
                                  "id": 9423,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "sender",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": null,
                                  "src": "3321:10:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                {
                                  "argumentTypes": null,
                                  "baseExpression": {
                                    "argumentTypes": null,
                                    "id": 9424,
                                    "name": "payoutAmounts",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9229,
                                    "src": "3333:13:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_array$_t_uint256_$dyn_memory_ptr",
                                      "typeString": "uint256[] memory"
                                    }
                                  },
                                  "id": 9426,
                                  "indexExpression": {
                                    "argumentTypes": null,
                                    "id": 9425,
                                    "name": "i",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9252,
                                    "src": "3347:1:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_uint8",
                                      "typeString": "uint8"
                                    }
                                  },
                                  "isConstant": false,
                                  "isLValue": true,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "nodeType": "IndexAccess",
                                  "src": "3333:16:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  },
                                  {
                                    "typeIdentifier": "t_uint256",
                                    "typeString": "uint256"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "baseExpression": {
                                        "argumentTypes": null,
                                        "id": 9417,
                                        "name": "tokenAddresses",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9240,
                                        "src": "3293:14:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                          "typeString": "address[] memory"
                                        }
                                      },
                                      "id": 9419,
                                      "indexExpression": {
                                        "argumentTypes": null,
                                        "id": 9418,
                                        "name": "i",
                                        "nodeType": "Identifier",
                                        "overloadedDeclarations": [],
                                        "referencedDeclaration": 9252,
                                        "src": "3308:1:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_uint8",
                                          "typeString": "uint8"
                                        }
                                      },
                                      "isConstant": false,
                                      "isLValue": true,
                                      "isPure": false,
                                      "lValueRequested": false,
                                      "nodeType": "IndexAccess",
                                      "src": "3293:17:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_address",
                                        "typeString": "address"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_address",
                                        "typeString": "address"
                                      }
                                    ],
                                    "id": 9416,
                                    "name": "ERC20",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 6697,
                                    "src": "3287:5:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_contract$_ERC20_$6697_$",
                                      "typeString": "type(contract ERC20)"
                                    }
                                  },
                                  "id": 9420,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "3287:24:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_ERC20_$6697",
                                    "typeString": "contract ERC20"
                                  }
                                },
                                "id": 9421,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "transfer",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6660,
                                "src": "3287:33:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$_t_address_$_t_uint256_$returns$_t_bool_$",
                                  "typeString": "function (address,uint256) external returns (bool)"
                                }
                              },
                              "id": 9427,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3287:63:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9415,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3279:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9428,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3279:72:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9429,
                        "nodeType": "ExpressionStatement",
                        "src": "3279:72:36"
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint8",
                      "typeString": "uint8"
                    },
                    "id": 9411,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9409,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9252,
                      "src": "3251:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "id": 9410,
                      "name": "numEntries",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9249,
                      "src": "3255:10:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "src": "3251:14:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9431,
                  "initializationExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9407,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "leftHandSide": {
                        "argumentTypes": null,
                        "id": 9405,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9252,
                        "src": "3244:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "nodeType": "Assignment",
                      "operator": "=",
                      "rightHandSide": {
                        "argumentTypes": null,
                        "hexValue": "30",
                        "id": 9406,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": true,
                        "kind": "number",
                        "lValueRequested": false,
                        "nodeType": "Literal",
                        "src": "3248:1:36",
                        "subdenomination": null,
                        "typeDescriptions": {
                          "typeIdentifier": "t_rational_0_by_1",
                          "typeString": "int_const 0"
                        },
                        "value": "0"
                      },
                      "src": "3244:5:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9408,
                    "nodeType": "ExpressionStatement",
                    "src": "3244:5:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9413,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "3267:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9412,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9252,
                        "src": "3267:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9414,
                    "nodeType": "ExpressionStatement",
                    "src": "3267:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "3240:118:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 9432,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "3370:4:36",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 9218,
                  "id": 9433,
                  "nodeType": "Return",
                  "src": "3363:11:36"
                }
              ]
            },
            "documentation": null,
            "id": 9435,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "retrieveAssetManagerTokens",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9215,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9214,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 9435,
                  "src": "1999:18:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                    "typeString": "bytes32[]"
                  },
                  "typeName": {
                    "baseType": {
                      "id": 9212,
                      "name": "bytes32",
                      "nodeType": "ElementaryTypeName",
                      "src": "1999:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      }
                    },
                    "id": 9213,
                    "length": null,
                    "nodeType": "ArrayTypeName",
                    "src": "1999:9:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_bytes32_$dyn_storage_ptr",
                      "typeString": "bytes32[]"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "1998:20:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9218,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9217,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9435,
                  "src": "2041:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9216,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "2041:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "2040:6:36"
            },
            "scope": 9607,
            "src": "1963:1416:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 9562,
              "nodeType": "Block",
              "src": "3465:713:36",
              "statements": [
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 9447,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9444,
                            "name": "_assetID",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9438,
                            "src": "3479:8:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                              "typeString": "bytes32[] calldata"
                            }
                          },
                          "id": 9445,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "length",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3479:15:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "<",
                        "rightExpression": {
                          "argumentTypes": null,
                          "hexValue": "3530",
                          "id": 9446,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "3497:2:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_50_by_1",
                            "typeString": "int_const 50"
                          },
                          "value": "50"
                        },
                        "src": "3479:20:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_bool",
                          "typeString": "bool"
                        }
                      ],
                      "id": 9443,
                      "name": "require",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [
                        13271,
                        13272
                      ],
                      "referencedDeclaration": 13271,
                      "src": "3471:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                        "typeString": "function (bool) pure"
                      }
                    },
                    "id": 9448,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "3471:29:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9449,
                  "nodeType": "ExpressionStatement",
                  "src": "3471:29:36"
                },
                {
                  "assignments": [],
                  "declarations": [
                    {
                      "constant": false,
                      "id": 9451,
                      "name": "weiOwed",
                      "nodeType": "VariableDeclaration",
                      "scope": 9563,
                      "src": "3506:12:36",
                      "stateVariable": false,
                      "storageLocation": "default",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      },
                      "typeName": {
                        "id": 9450,
                        "name": "uint",
                        "nodeType": "ElementaryTypeName",
                        "src": "3506:4:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      },
                      "value": null,
                      "visibility": "internal"
                    }
                  ],
                  "id": 9452,
                  "initialValue": null,
                  "nodeType": "VariableDeclarationStatement",
                  "src": "3506:12:36"
                },
                {
                  "body": {
                    "id": 9550,
                    "nodeType": "Block",
                    "src": "3566:557:36",
                    "statements": [
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              },
                              "id": 9479,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9465,
                                  "name": "msg",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13268,
                                  "src": "3582:3:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_magic_message",
                                    "typeString": "msg"
                                  }
                                },
                                "id": 9466,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "sender",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "3582:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "arguments": [
                                  {
                                    "argumentTypes": null,
                                    "arguments": [
                                      {
                                        "argumentTypes": null,
                                        "arguments": [
                                          {
                                            "argumentTypes": null,
                                            "hexValue": "61737365744d616e61676572",
                                            "id": 9472,
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": true,
                                            "kind": "string",
                                            "lValueRequested": false,
                                            "nodeType": "Literal",
                                            "src": "3647:14:36",
                                            "subdenomination": null,
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            "value": "assetManager"
                                          },
                                          {
                                            "argumentTypes": null,
                                            "baseExpression": {
                                              "argumentTypes": null,
                                              "id": 9473,
                                              "name": "_assetID",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9438,
                                              "src": "3663:8:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                                "typeString": "bytes32[] calldata"
                                              }
                                            },
                                            "id": 9475,
                                            "indexExpression": {
                                              "argumentTypes": null,
                                              "id": 9474,
                                              "name": "i",
                                              "nodeType": "Identifier",
                                              "overloadedDeclarations": [],
                                              "referencedDeclaration": 9454,
                                              "src": "3672:1:36",
                                              "typeDescriptions": {
                                                "typeIdentifier": "t_uint8",
                                                "typeString": "uint8"
                                              }
                                            },
                                            "isConstant": false,
                                            "isLValue": false,
                                            "isPure": false,
                                            "lValueRequested": false,
                                            "nodeType": "IndexAccess",
                                            "src": "3663:11:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": [
                                            {
                                              "typeIdentifier": "t_stringliteral_9c94184d91f4f379375bc02dabb446ab73b4693daaa1649948930b3bc1c8e06c",
                                              "typeString": "literal_string \"assetManager\""
                                            },
                                            {
                                              "typeIdentifier": "t_bytes32",
                                              "typeString": "bytes32"
                                            }
                                          ],
                                          "expression": {
                                            "argumentTypes": null,
                                            "id": 9470,
                                            "name": "abi",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 13255,
                                            "src": "3630:3:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_magic_abi",
                                              "typeString": "abi"
                                            }
                                          },
                                          "id": 9471,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "lValueRequested": false,
                                          "memberName": "encodePacked",
                                          "nodeType": "MemberAccess",
                                          "referencedDeclaration": null,
                                          "src": "3630:16:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                            "typeString": "function () pure returns (bytes memory)"
                                          }
                                        },
                                        "id": 9476,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": false,
                                        "kind": "functionCall",
                                        "lValueRequested": false,
                                        "names": [],
                                        "nodeType": "FunctionCall",
                                        "src": "3630:45:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      }
                                    ],
                                    "expression": {
                                      "argumentTypes": [
                                        {
                                          "typeIdentifier": "t_bytes_memory_ptr",
                                          "typeString": "bytes memory"
                                        }
                                      ],
                                      "id": 9469,
                                      "name": "keccak256",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13262,
                                      "src": "3620:9:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                        "typeString": "function () pure returns (bytes32)"
                                      }
                                    },
                                    "id": 9477,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": false,
                                    "kind": "functionCall",
                                    "lValueRequested": false,
                                    "names": [],
                                    "nodeType": "FunctionCall",
                                    "src": "3620:56:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": [
                                    {
                                      "typeIdentifier": "t_bytes32",
                                      "typeString": "bytes32"
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": null,
                                    "id": 9467,
                                    "name": "database",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 9028,
                                    "src": "3596:8:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_contract$_DBInterface_$6501",
                                      "typeString": "contract DBInterface"
                                    }
                                  },
                                  "id": 9468,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "lValueRequested": false,
                                  "memberName": "addressStorage",
                                  "nodeType": "MemberAccess",
                                  "referencedDeclaration": 6472,
                                  "src": "3596:23:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                    "typeString": "function (bytes32) view external returns (address)"
                                  }
                                },
                                "id": 9478,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "kind": "functionCall",
                                "lValueRequested": false,
                                "names": [],
                                "nodeType": "FunctionCall",
                                "src": "3596:81:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_address",
                                  "typeString": "address"
                                }
                              },
                              "src": "3582:95:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9464,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3574:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9480,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3574:104:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9481,
                        "nodeType": "ExpressionStatement",
                        "src": "3574:104:36"
                      },
                      {
                        "assignments": [
                          9483
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9483,
                            "name": "token",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3686:12:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_contract$_DToken_$9023",
                              "typeString": "contract DToken"
                            },
                            "typeName": {
                              "contractScope": null,
                              "id": 9482,
                              "name": "DToken",
                              "nodeType": "UserDefinedTypeName",
                              "referencedDeclaration": 9023,
                              "src": "3686:6:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9498,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "arguments": [
                                        {
                                          "argumentTypes": null,
                                          "hexValue": "746f6b656e41646472657373",
                                          "id": 9490,
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": true,
                                          "kind": "string",
                                          "lValueRequested": false,
                                          "nodeType": "Literal",
                                          "src": "3759:14:36",
                                          "subdenomination": null,
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          "value": "tokenAddress"
                                        },
                                        {
                                          "argumentTypes": null,
                                          "baseExpression": {
                                            "argumentTypes": null,
                                            "id": 9491,
                                            "name": "_assetID",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9438,
                                            "src": "3775:8:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                                              "typeString": "bytes32[] calldata"
                                            }
                                          },
                                          "id": 9493,
                                          "indexExpression": {
                                            "argumentTypes": null,
                                            "id": 9492,
                                            "name": "i",
                                            "nodeType": "Identifier",
                                            "overloadedDeclarations": [],
                                            "referencedDeclaration": 9454,
                                            "src": "3784:1:36",
                                            "typeDescriptions": {
                                              "typeIdentifier": "t_uint8",
                                              "typeString": "uint8"
                                            }
                                          },
                                          "isConstant": false,
                                          "isLValue": false,
                                          "isPure": false,
                                          "lValueRequested": false,
                                          "nodeType": "IndexAccess",
                                          "src": "3775:11:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        }
                                      ],
                                      "expression": {
                                        "argumentTypes": [
                                          {
                                            "typeIdentifier": "t_stringliteral_9ee6ac5167541cd26e2ccac032a8a19ef54a7dfb16e33d0e9a7468c56bc3fd11",
                                            "typeString": "literal_string \"tokenAddress\""
                                          },
                                          {
                                            "typeIdentifier": "t_bytes32",
                                            "typeString": "bytes32"
                                          }
                                        ],
                                        "expression": {
                                          "argumentTypes": null,
                                          "id": 9488,
                                          "name": "abi",
                                          "nodeType": "Identifier",
                                          "overloadedDeclarations": [],
                                          "referencedDeclaration": 13255,
                                          "src": "3742:3:36",
                                          "typeDescriptions": {
                                            "typeIdentifier": "t_magic_abi",
                                            "typeString": "abi"
                                          }
                                        },
                                        "id": 9489,
                                        "isConstant": false,
                                        "isLValue": false,
                                        "isPure": true,
                                        "lValueRequested": false,
                                        "memberName": "encodePacked",
                                        "nodeType": "MemberAccess",
                                        "referencedDeclaration": null,
                                        "src": "3742:16:36",
                                        "typeDescriptions": {
                                          "typeIdentifier": "t_function_abiencodepacked_pure$__$returns$_t_bytes_memory_ptr_$",
                                          "typeString": "function () pure returns (bytes memory)"
                                        }
                                      },
                                      "id": 9494,
                                      "isConstant": false,
                                      "isLValue": false,
                                      "isPure": false,
                                      "kind": "functionCall",
                                      "lValueRequested": false,
                                      "names": [],
                                      "nodeType": "FunctionCall",
                                      "src": "3742:45:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_bytes_memory_ptr",
                                        "typeString": "bytes memory"
                                      }
                                    ],
                                    "id": 9487,
                                    "name": "keccak256",
                                    "nodeType": "Identifier",
                                    "overloadedDeclarations": [],
                                    "referencedDeclaration": 13262,
                                    "src": "3732:9:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_function_sha3_pure$__$returns$_t_bytes32_$",
                                      "typeString": "function () pure returns (bytes32)"
                                    }
                                  },
                                  "id": 9495,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "functionCall",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "3732:56:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_bytes32",
                                    "typeString": "bytes32"
                                  }
                                ],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9485,
                                  "name": "database",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9028,
                                  "src": "3708:8:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DBInterface_$6501",
                                    "typeString": "contract DBInterface"
                                  }
                                },
                                "id": 9486,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "addressStorage",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 6472,
                                "src": "3708:23:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_view$_t_bytes32_$returns$_t_address_$",
                                  "typeString": "function (bytes32) view external returns (address)"
                                }
                              },
                              "id": 9496,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3708:81:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "id": 9484,
                            "name": "DToken",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9023,
                            "src": "3701:6:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_type$_t_contract$_DToken_$9023_$",
                              "typeString": "type(contract DToken)"
                            }
                          },
                          "id": 9497,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "typeConversion",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3701:89:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_contract$_DToken_$9023",
                            "typeString": "contract DToken"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3686:104:36"
                      },
                      {
                        "assignments": [
                          9500
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9500,
                            "name": "balanceBefore",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3798:18:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9499,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "3798:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9505,
                        "initialValue": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "id": 9502,
                                "name": "this",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 13383,
                                "src": "3827:4:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                  "typeString": "contract AssetManagerFunds"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                  "typeString": "contract AssetManagerFunds"
                                }
                              ],
                              "id": 9501,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": true,
                              "lValueRequested": false,
                              "nodeType": "ElementaryTypeNameExpression",
                              "src": "3819:7:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_type$_t_address_$",
                                "typeString": "type(address)"
                              },
                              "typeName": "address"
                            },
                            "id": 9503,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "typeConversion",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "3819:13:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          "id": 9504,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "balance",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "3819:21:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3798:42:36"
                      },
                      {
                        "assignments": [
                          9507
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9507,
                            "name": "amountOwed",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3848:15:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9506,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "3848:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9514,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [
                                {
                                  "argumentTypes": null,
                                  "id": 9511,
                                  "name": "this",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 13383,
                                  "src": "3894:4:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                }
                              ],
                              "expression": {
                                "argumentTypes": [
                                  {
                                    "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                    "typeString": "contract AssetManagerFunds"
                                  }
                                ],
                                "id": 9510,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "lValueRequested": false,
                                "nodeType": "ElementaryTypeNameExpression",
                                "src": "3886:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_type$_t_address_$",
                                  "typeString": "type(address)"
                                },
                                "typeName": "address"
                              },
                              "id": 9512,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "typeConversion",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "3886:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_address",
                                "typeString": "address"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9508,
                              "name": "token",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9483,
                              "src": "3866:5:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_contract$_DToken_$9023",
                                "typeString": "contract DToken"
                              }
                            },
                            "id": 9509,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "getAmountOwed",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 9001,
                            "src": "3866:19:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_external_view$_t_address_$returns$_t_uint256_$",
                              "typeString": "function (address) view external returns (uint256)"
                            }
                          },
                          "id": 9513,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3866:34:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3848:52:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9518,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "id": 9516,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9507,
                                "src": "3916:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": ">",
                              "rightExpression": {
                                "argumentTypes": null,
                                "hexValue": "30",
                                "id": 9517,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": true,
                                "kind": "number",
                                "lValueRequested": false,
                                "nodeType": "Literal",
                                "src": "3929:1:36",
                                "subdenomination": null,
                                "typeDescriptions": {
                                  "typeIdentifier": "t_rational_0_by_1",
                                  "typeString": "int_const 0"
                                },
                                "value": "0"
                              },
                              "src": "3916:14:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9515,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3908:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9519,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3908:23:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9520,
                        "nodeType": "ExpressionStatement",
                        "src": "3908:23:36"
                      },
                      {
                        "assignments": [
                          9522
                        ],
                        "declarations": [
                          {
                            "constant": false,
                            "id": 9522,
                            "name": "balanceAfter",
                            "nodeType": "VariableDeclaration",
                            "scope": 9563,
                            "src": "3939:17:36",
                            "stateVariable": false,
                            "storageLocation": "default",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            },
                            "typeName": {
                              "id": 9521,
                              "name": "uint",
                              "nodeType": "ElementaryTypeName",
                              "src": "3939:4:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "value": null,
                            "visibility": "internal"
                          }
                        ],
                        "id": 9527,
                        "initialValue": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "id": 9525,
                              "name": "amountOwed",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9507,
                              "src": "3977:10:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            ],
                            "expression": {
                              "argumentTypes": null,
                              "id": 9523,
                              "name": "balanceBefore",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9500,
                              "src": "3959:13:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              }
                            },
                            "id": 9524,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "lValueRequested": false,
                            "memberName": "add",
                            "nodeType": "MemberAccess",
                            "referencedDeclaration": 6914,
                            "src": "3959:17:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                              "typeString": "function (uint256,uint256) pure returns (uint256)"
                            }
                          },
                          "id": 9526,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3959:29:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "VariableDeclarationStatement",
                        "src": "3939:49:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "arguments": [],
                              "expression": {
                                "argumentTypes": [],
                                "expression": {
                                  "argumentTypes": null,
                                  "id": 9529,
                                  "name": "token",
                                  "nodeType": "Identifier",
                                  "overloadedDeclarations": [],
                                  "referencedDeclaration": 9483,
                                  "src": "4004:5:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_contract$_DToken_$9023",
                                    "typeString": "contract DToken"
                                  }
                                },
                                "id": 9530,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "withdraw",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": 8994,
                                "src": "4004:14:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_function_external_nonpayable$__$returns$_t_bool_$",
                                  "typeString": "function () external returns (bool)"
                                }
                              },
                              "id": 9531,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "kind": "functionCall",
                              "lValueRequested": false,
                              "names": [],
                              "nodeType": "FunctionCall",
                              "src": "4004:16:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9528,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "3996:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9532,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "3996:25:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9533,
                        "nodeType": "ExpressionStatement",
                        "src": "3996:25:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "arguments": [
                            {
                              "argumentTypes": null,
                              "commonType": {
                                "typeIdentifier": "t_uint256",
                                "typeString": "uint256"
                              },
                              "id": 9540,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "leftExpression": {
                                "argumentTypes": null,
                                "expression": {
                                  "argumentTypes": null,
                                  "arguments": [
                                    {
                                      "argumentTypes": null,
                                      "id": 9536,
                                      "name": "this",
                                      "nodeType": "Identifier",
                                      "overloadedDeclarations": [],
                                      "referencedDeclaration": 13383,
                                      "src": "4045:4:36",
                                      "typeDescriptions": {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    }
                                  ],
                                  "expression": {
                                    "argumentTypes": [
                                      {
                                        "typeIdentifier": "t_contract$_AssetManagerFunds_$9607",
                                        "typeString": "contract AssetManagerFunds"
                                      }
                                    ],
                                    "id": 9535,
                                    "isConstant": false,
                                    "isLValue": false,
                                    "isPure": true,
                                    "lValueRequested": false,
                                    "nodeType": "ElementaryTypeNameExpression",
                                    "src": "4037:7:36",
                                    "typeDescriptions": {
                                      "typeIdentifier": "t_type$_t_address_$",
                                      "typeString": "type(address)"
                                    },
                                    "typeName": "address"
                                  },
                                  "id": 9537,
                                  "isConstant": false,
                                  "isLValue": false,
                                  "isPure": false,
                                  "kind": "typeConversion",
                                  "lValueRequested": false,
                                  "names": [],
                                  "nodeType": "FunctionCall",
                                  "src": "4037:13:36",
                                  "typeDescriptions": {
                                    "typeIdentifier": "t_address",
                                    "typeString": "address"
                                  }
                                },
                                "id": 9538,
                                "isConstant": false,
                                "isLValue": false,
                                "isPure": false,
                                "lValueRequested": false,
                                "memberName": "balance",
                                "nodeType": "MemberAccess",
                                "referencedDeclaration": null,
                                "src": "4037:21:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "nodeType": "BinaryOperation",
                              "operator": "==",
                              "rightExpression": {
                                "argumentTypes": null,
                                "id": 9539,
                                "name": "balanceAfter",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9522,
                                "src": "4062:12:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "src": "4037:37:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            }
                          ],
                          "expression": {
                            "argumentTypes": [
                              {
                                "typeIdentifier": "t_bool",
                                "typeString": "bool"
                              }
                            ],
                            "id": 9534,
                            "name": "require",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [
                              13271,
                              13272
                            ],
                            "referencedDeclaration": 13271,
                            "src": "4029:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_function_require_pure$_t_bool_$returns$__$",
                              "typeString": "function (bool) pure"
                            }
                          },
                          "id": 9541,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "kind": "functionCall",
                          "lValueRequested": false,
                          "names": [],
                          "nodeType": "FunctionCall",
                          "src": "4029:46:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_tuple$__$",
                            "typeString": "tuple()"
                          }
                        },
                        "id": 9542,
                        "nodeType": "ExpressionStatement",
                        "src": "4029:46:36"
                      },
                      {
                        "expression": {
                          "argumentTypes": null,
                          "id": 9548,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftHandSide": {
                            "argumentTypes": null,
                            "id": 9543,
                            "name": "weiOwed",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9451,
                            "src": "4083:7:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "nodeType": "Assignment",
                          "operator": "=",
                          "rightHandSide": {
                            "argumentTypes": null,
                            "arguments": [
                              {
                                "argumentTypes": null,
                                "id": 9546,
                                "name": "amountOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9507,
                                "src": "4105:10:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              }
                            ],
                            "expression": {
                              "argumentTypes": [
                                {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              ],
                              "expression": {
                                "argumentTypes": null,
                                "id": 9544,
                                "name": "weiOwed",
                                "nodeType": "Identifier",
                                "overloadedDeclarations": [],
                                "referencedDeclaration": 9451,
                                "src": "4093:7:36",
                                "typeDescriptions": {
                                  "typeIdentifier": "t_uint256",
                                  "typeString": "uint256"
                                }
                              },
                              "id": 9545,
                              "isConstant": false,
                              "isLValue": false,
                              "isPure": false,
                              "lValueRequested": false,
                              "memberName": "add",
                              "nodeType": "MemberAccess",
                              "referencedDeclaration": 6914,
                              "src": "4093:11:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_function_internal_pure$_t_uint256_$_t_uint256_$returns$_t_uint256_$bound_to$_t_uint256_$",
                                "typeString": "function (uint256,uint256) pure returns (uint256)"
                              }
                            },
                            "id": 9547,
                            "isConstant": false,
                            "isLValue": false,
                            "isPure": false,
                            "kind": "functionCall",
                            "lValueRequested": false,
                            "names": [],
                            "nodeType": "FunctionCall",
                            "src": "4093:23:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint256",
                              "typeString": "uint256"
                            }
                          },
                          "src": "4083:33:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "id": 9549,
                        "nodeType": "ExpressionStatement",
                        "src": "4083:33:36"
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 9460,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9457,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9454,
                      "src": "3541:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "expression": {
                        "argumentTypes": null,
                        "id": 9458,
                        "name": "_assetID",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9438,
                        "src": "3545:8:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                          "typeString": "bytes32[] calldata"
                        }
                      },
                      "id": 9459,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "length",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "3545:15:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "src": "3541:19:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9551,
                  "initializationExpression": {
                    "assignments": [
                      9454
                    ],
                    "declarations": [
                      {
                        "constant": false,
                        "id": 9454,
                        "name": "i",
                        "nodeType": "VariableDeclaration",
                        "scope": 9563,
                        "src": "3528:7:36",
                        "stateVariable": false,
                        "storageLocation": "default",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        },
                        "typeName": {
                          "id": 9453,
                          "name": "uint8",
                          "nodeType": "ElementaryTypeName",
                          "src": "3528:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "value": null,
                        "visibility": "internal"
                      }
                    ],
                    "id": 9456,
                    "initialValue": {
                      "argumentTypes": null,
                      "hexValue": "30",
                      "id": 9455,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "3538:1:36",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_0_by_1",
                        "typeString": "int_const 0"
                      },
                      "value": "0"
                    },
                    "nodeType": "VariableDeclarationStatement",
                    "src": "3528:11:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9462,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "3562:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9461,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9454,
                        "src": "3562:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9463,
                    "nodeType": "ExpressionStatement",
                    "src": "3562:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "3524:599:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "id": 9557,
                        "name": "weiOwed",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9451,
                        "src": "4148:7:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "expression": {
                        "argumentTypes": null,
                        "expression": {
                          "argumentTypes": null,
                          "id": 9552,
                          "name": "msg",
                          "nodeType": "Identifier",
                          "overloadedDeclarations": [],
                          "referencedDeclaration": 13268,
                          "src": "4128:3:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_magic_message",
                            "typeString": "msg"
                          }
                        },
                        "id": 9555,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "memberName": "sender",
                        "nodeType": "MemberAccess",
                        "referencedDeclaration": null,
                        "src": "4128:10:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_address",
                          "typeString": "address"
                        }
                      },
                      "id": 9556,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "transfer",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "4128:19:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_function_transfer_nonpayable$_t_uint256_$returns$__$",
                        "typeString": "function (uint256)"
                      }
                    },
                    "id": 9558,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "functionCall",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4128:28:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_tuple$__$",
                      "typeString": "tuple()"
                    }
                  },
                  "id": 9559,
                  "nodeType": "ExpressionStatement",
                  "src": "4128:28:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "hexValue": "74727565",
                    "id": 9560,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": true,
                    "kind": "bool",
                    "lValueRequested": false,
                    "nodeType": "Literal",
                    "src": "4169:4:36",
                    "subdenomination": null,
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    },
                    "value": "true"
                  },
                  "functionReturnParameters": 9442,
                  "id": 9561,
                  "nodeType": "Return",
                  "src": "4162:11:36"
                }
              ]
            },
            "documentation": null,
            "id": 9563,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "retrieveAssetManagerETH",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9439,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9438,
                  "name": "_assetID",
                  "nodeType": "VariableDeclaration",
                  "scope": 9563,
                  "src": "3417:18:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_array$_t_bytes32_$dyn_calldata_ptr",
                    "typeString": "bytes32[]"
                  },
                  "typeName": {
                    "baseType": {
                      "id": 9436,
                      "name": "bytes32",
                      "nodeType": "ElementaryTypeName",
                      "src": "3417:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_bytes32",
                        "typeString": "bytes32"
                      }
                    },
                    "id": 9437,
                    "length": null,
                    "nodeType": "ArrayTypeName",
                    "src": "3417:9:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_bytes32_$dyn_storage_ptr",
                      "typeString": "bytes32[]"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3416:20:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9442,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9441,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9563,
                  "src": "3459:4:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_bool",
                    "typeString": "bool"
                  },
                  "typeName": {
                    "id": 9440,
                    "name": "bool",
                    "nodeType": "ElementaryTypeName",
                    "src": "3459:4:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "3458:6:36"
            },
            "scope": 9607,
            "src": "3384:794:36",
            "stateMutability": "nonpayable",
            "superFunction": null,
            "visibility": "external"
          },
          {
            "body": {
              "id": 9601,
              "nodeType": "Block",
              "src": "4282:153:36",
              "statements": [
                {
                  "body": {
                    "id": 9592,
                    "nodeType": "Block",
                    "src": "4335:53:36",
                    "statements": [
                      {
                        "condition": {
                          "argumentTypes": null,
                          "commonType": {
                            "typeIdentifier": "t_address",
                            "typeString": "address"
                          },
                          "id": 9588,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "leftExpression": {
                            "argumentTypes": null,
                            "baseExpression": {
                              "argumentTypes": null,
                              "id": 9584,
                              "name": "_addressList",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9566,
                              "src": "4347:12:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                                "typeString": "address[] memory"
                              }
                            },
                            "id": 9586,
                            "indexExpression": {
                              "argumentTypes": null,
                              "id": 9585,
                              "name": "i",
                              "nodeType": "Identifier",
                              "overloadedDeclarations": [],
                              "referencedDeclaration": 9574,
                              "src": "4360:1:36",
                              "typeDescriptions": {
                                "typeIdentifier": "t_uint8",
                                "typeString": "uint8"
                              }
                            },
                            "isConstant": false,
                            "isLValue": true,
                            "isPure": false,
                            "lValueRequested": false,
                            "nodeType": "IndexAccess",
                            "src": "4347:15:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          "nodeType": "BinaryOperation",
                          "operator": "==",
                          "rightExpression": {
                            "argumentTypes": null,
                            "id": 9587,
                            "name": "_addr",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9568,
                            "src": "4366:5:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_address",
                              "typeString": "address"
                            }
                          },
                          "src": "4347:24:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_bool",
                            "typeString": "bool"
                          }
                        },
                        "falseBody": null,
                        "id": 9591,
                        "nodeType": "IfStatement",
                        "src": "4343:38:36",
                        "trueBody": {
                          "expression": {
                            "argumentTypes": null,
                            "id": 9589,
                            "name": "i",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9574,
                            "src": "4380:1:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_uint8",
                              "typeString": "uint8"
                            }
                          },
                          "functionReturnParameters": 9572,
                          "id": 9590,
                          "nodeType": "Return",
                          "src": "4373:8:36"
                        }
                      }
                    ]
                  },
                  "condition": {
                    "argumentTypes": null,
                    "commonType": {
                      "typeIdentifier": "t_uint256",
                      "typeString": "uint256"
                    },
                    "id": 9580,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "lValueRequested": false,
                    "leftExpression": {
                      "argumentTypes": null,
                      "id": 9577,
                      "name": "i",
                      "nodeType": "Identifier",
                      "overloadedDeclarations": [],
                      "referencedDeclaration": 9574,
                      "src": "4306:1:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "nodeType": "BinaryOperation",
                    "operator": "<",
                    "rightExpression": {
                      "argumentTypes": null,
                      "expression": {
                        "argumentTypes": null,
                        "id": 9578,
                        "name": "_addressList",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9566,
                        "src": "4310:12:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                          "typeString": "address[] memory"
                        }
                      },
                      "id": 9579,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "memberName": "length",
                      "nodeType": "MemberAccess",
                      "referencedDeclaration": null,
                      "src": "4310:19:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint256",
                        "typeString": "uint256"
                      }
                    },
                    "src": "4306:23:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_bool",
                      "typeString": "bool"
                    }
                  },
                  "id": 9593,
                  "initializationExpression": {
                    "assignments": [
                      9574
                    ],
                    "declarations": [
                      {
                        "constant": false,
                        "id": 9574,
                        "name": "i",
                        "nodeType": "VariableDeclaration",
                        "scope": 9602,
                        "src": "4293:7:36",
                        "stateVariable": false,
                        "storageLocation": "default",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        },
                        "typeName": {
                          "id": 9573,
                          "name": "uint8",
                          "nodeType": "ElementaryTypeName",
                          "src": "4293:5:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint8",
                            "typeString": "uint8"
                          }
                        },
                        "value": null,
                        "visibility": "internal"
                      }
                    ],
                    "id": 9576,
                    "initialValue": {
                      "argumentTypes": null,
                      "hexValue": "30",
                      "id": 9575,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "kind": "number",
                      "lValueRequested": false,
                      "nodeType": "Literal",
                      "src": "4303:1:36",
                      "subdenomination": null,
                      "typeDescriptions": {
                        "typeIdentifier": "t_rational_0_by_1",
                        "typeString": "int_const 0"
                      },
                      "value": "0"
                    },
                    "nodeType": "VariableDeclarationStatement",
                    "src": "4293:11:36"
                  },
                  "loopExpression": {
                    "expression": {
                      "argumentTypes": null,
                      "id": 9582,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": false,
                      "lValueRequested": false,
                      "nodeType": "UnaryOperation",
                      "operator": "++",
                      "prefix": false,
                      "src": "4331:3:36",
                      "subExpression": {
                        "argumentTypes": null,
                        "id": 9581,
                        "name": "i",
                        "nodeType": "Identifier",
                        "overloadedDeclarations": [],
                        "referencedDeclaration": 9574,
                        "src": "4331:1:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint8",
                          "typeString": "uint8"
                        }
                      },
                      "typeDescriptions": {
                        "typeIdentifier": "t_uint8",
                        "typeString": "uint8"
                      }
                    },
                    "id": 9583,
                    "nodeType": "ExpressionStatement",
                    "src": "4331:3:36"
                  },
                  "nodeType": "ForStatement",
                  "src": "4288:100:36"
                },
                {
                  "expression": {
                    "argumentTypes": null,
                    "arguments": [
                      {
                        "argumentTypes": null,
                        "commonType": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        },
                        "id": 9598,
                        "isConstant": false,
                        "isLValue": false,
                        "isPure": false,
                        "lValueRequested": false,
                        "leftExpression": {
                          "argumentTypes": null,
                          "expression": {
                            "argumentTypes": null,
                            "id": 9595,
                            "name": "_addressList",
                            "nodeType": "Identifier",
                            "overloadedDeclarations": [],
                            "referencedDeclaration": 9566,
                            "src": "4406:12:36",
                            "typeDescriptions": {
                              "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                              "typeString": "address[] memory"
                            }
                          },
                          "id": 9596,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": false,
                          "lValueRequested": false,
                          "memberName": "length",
                          "nodeType": "MemberAccess",
                          "referencedDeclaration": null,
                          "src": "4406:19:36",
                          "typeDescriptions": {
                            "typeIdentifier": "t_uint256",
                            "typeString": "uint256"
                          }
                        },
                        "nodeType": "BinaryOperation",
                        "operator": "+",
                        "rightExpression": {
                          "argumentTypes": null,
                          "hexValue": "31",
                          "id": 9597,
                          "isConstant": false,
                          "isLValue": false,
                          "isPure": true,
                          "kind": "number",
                          "lValueRequested": false,
                          "nodeType": "Literal",
                          "src": "4428:1:36",
                          "subdenomination": null,
                          "typeDescriptions": {
                            "typeIdentifier": "t_rational_1_by_1",
                            "typeString": "int_const 1"
                          },
                          "value": "1"
                        },
                        "src": "4406:23:36",
                        "typeDescriptions": {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      }
                    ],
                    "expression": {
                      "argumentTypes": [
                        {
                          "typeIdentifier": "t_uint256",
                          "typeString": "uint256"
                        }
                      ],
                      "id": 9594,
                      "isConstant": false,
                      "isLValue": false,
                      "isPure": true,
                      "lValueRequested": false,
                      "nodeType": "ElementaryTypeNameExpression",
                      "src": "4400:5:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_type$_t_uint8_$",
                        "typeString": "type(uint8)"
                      },
                      "typeName": "uint8"
                    },
                    "id": 9599,
                    "isConstant": false,
                    "isLValue": false,
                    "isPure": false,
                    "kind": "typeConversion",
                    "lValueRequested": false,
                    "names": [],
                    "nodeType": "FunctionCall",
                    "src": "4400:30:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint8",
                      "typeString": "uint8"
                    }
                  },
                  "functionReturnParameters": 9572,
                  "id": 9600,
                  "nodeType": "Return",
                  "src": "4393:37:36"
                }
              ]
            },
            "documentation": null,
            "id": 9602,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": true,
            "modifiers": [],
            "name": "containsAddress",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9569,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9566,
                  "name": "_addressList",
                  "nodeType": "VariableDeclaration",
                  "scope": 9602,
                  "src": "4207:22:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_array$_t_address_$dyn_memory_ptr",
                    "typeString": "address[]"
                  },
                  "typeName": {
                    "baseType": {
                      "id": 9564,
                      "name": "address",
                      "nodeType": "ElementaryTypeName",
                      "src": "4207:7:36",
                      "typeDescriptions": {
                        "typeIdentifier": "t_address",
                        "typeString": "address"
                      }
                    },
                    "id": 9565,
                    "length": null,
                    "nodeType": "ArrayTypeName",
                    "src": "4207:9:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_array$_t_address_$dyn_storage_ptr",
                      "typeString": "address[]"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                },
                {
                  "constant": false,
                  "id": 9568,
                  "name": "_addr",
                  "nodeType": "VariableDeclaration",
                  "scope": 9602,
                  "src": "4231:13:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_address",
                    "typeString": "address"
                  },
                  "typeName": {
                    "id": 9567,
                    "name": "address",
                    "nodeType": "ElementaryTypeName",
                    "src": "4231:7:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_address",
                      "typeString": "address"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4206:39:36"
            },
            "payable": false,
            "returnParameters": {
              "id": 9572,
              "nodeType": "ParameterList",
              "parameters": [
                {
                  "constant": false,
                  "id": 9571,
                  "name": "",
                  "nodeType": "VariableDeclaration",
                  "scope": 9602,
                  "src": "4275:5:36",
                  "stateVariable": false,
                  "storageLocation": "default",
                  "typeDescriptions": {
                    "typeIdentifier": "t_uint8",
                    "typeString": "uint8"
                  },
                  "typeName": {
                    "id": 9570,
                    "name": "uint8",
                    "nodeType": "ElementaryTypeName",
                    "src": "4275:5:36",
                    "typeDescriptions": {
                      "typeIdentifier": "t_uint8",
                      "typeString": "uint8"
                    }
                  },
                  "value": null,
                  "visibility": "internal"
                }
              ],
              "src": "4274:7:36"
            },
            "scope": 9607,
            "src": "4182:253:36",
            "stateMutability": "pure",
            "superFunction": null,
            "visibility": "internal"
          },
          {
            "body": {
              "id": 9605,
              "nodeType": "Block",
              "src": "4470:2:36",
              "statements": []
            },
            "documentation": null,
            "id": 9606,
            "implemented": true,
            "isConstructor": false,
            "isDeclaredConst": false,
            "modifiers": [],
            "name": "",
            "nodeType": "FunctionDefinition",
            "parameters": {
              "id": 9603,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "4448:2:36"
            },
            "payable": true,
            "returnParameters": {
              "id": 9604,
              "nodeType": "ParameterList",
              "parameters": [],
              "src": "4470:0:36"
            },
            "scope": 9607,
            "src": "4439:33:36",
            "stateMutability": "payable",
            "superFunction": null,
            "visibility": "public"
          }
        ],
        "scope": 9608,
        "src": "712:3763:36"
      }
    ],
    "src": "0:4476:36"
  },
  "compiler": {
    "name": "solc",
    "version": "0.4.24+commit.e67f0147.Emscripten.clang"
  },
  "networks": {},
  "schemaVersion": "2.0.1",
  "updatedAt": "2018-10-17T18:28:17.912Z"
}