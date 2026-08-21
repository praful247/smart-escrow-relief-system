import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  networks: {
    cleartrust: {
      url: "http://127.0.0.1:9654/ext/bc/2hSpV1HF3HUJiP9WgKYeYTEKimq4F2rpA2tx6sJM5nmXvDF4pQ/rpc",
      chainId: 123456,
      accounts: ["0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027"]
    }
  }
};
