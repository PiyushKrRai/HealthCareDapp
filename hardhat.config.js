/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-waffle");

const { PrivateKey } = require('./secret.json');

module.exports = {
   defaultNetwork: 'testnet',

   networks: {
      hardhat: {
      },
      testnet: {
         url: 'https://rpc.test2.btcs.network',
         accounts: [PrivateKey],
         chainId: 1115,  // Ensure this matches the Core testnet chain ID
      }
   },
   solidity: {
      compilers: [
        {
           version: '0.8.21',  // Update to at least 0.8.20 to support the 'paris' EVM
           settings: {
              evmVersion: 'paris',  // Specify 'paris' EVM version
              optimizer: {
                 enabled: true,
                 runs: 200,
              },
           },
        },
      ],
   },
   paths: {
      sources: './contracts',
      cache: './cache',
      artifacts: './artifacts',
   },
   mocha: {
      timeout: 20000,  // You can adjust the timeout as needed
   },
};