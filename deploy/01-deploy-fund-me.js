const { network } = require("hardhat")
require("dotenv").config()
const { verify } = require("../utils/verify")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")


// import 
// main function
// calling of main function

/* function deployFunc() {
    console.log("Salem")
}

module.exports.default = deployFunc */

module.exports = async ({getNamedAccounts, deployments}) => {

    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // const ethUsdPriceFeedAddress = networkConfig[chainId][ethUsdPriceFeed]
    let ethUsdPriceFeedAddress;

    if(developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    // to make the life easier
    const args = [ethUsdPriceFeedAddress];

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, //address's gonna be here
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(fundMe.address, args)
    }
}

module.exports.tags = ["all", "fundme"]
