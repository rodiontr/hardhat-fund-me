const { assert } = require("chai")
const { ethers, getNamedAccounts, network } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains } = require("../../helper-hardhat-config")

// we can wrap this whole thing up in developmentChains to make sure the tests are only deployed
// if we're working on an actual testnet not on the development chains

developmentChains.includes(network.name) 
? describe.skip 
: describe("FundMe", function() {
    let fundMe
    let deployer
    const sendValue = ethers.utils.parseEther("0.1")
    beforeEach(async function() {
        deployer = (await getNamedAccounts()).deployer
        fundMe = await ethers.getContract("FundMe", deployer)
    })

    it("allows people to fund and withdraw", async function() {
        await fundMe.fund({ value: sendValue})
        await fundMe.withdraw()
        const endingBalance = fundMe.provider.getBalance(fundMe.address)
        assert.equal(endingBalance, "0")
    })
})