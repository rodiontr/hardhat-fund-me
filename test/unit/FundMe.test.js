const { assert, expect } = require("chai")
const {deployments, ethers, getNamedAccounts} = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
? describe.skip 
: describe("FundMe", async function() {

    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")

    beforeEach(async function () {
        // deploy our fundMe contract
        // using hardhat deploy

        // another way to get multiple accounts:

        // const accounts = await ethers.getSigners()
        // const accountOne = accounts[0]

        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        // after we deployed everything in our deploy folder, we gonna cling to our contracts
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)

    })

    describe("constructor", async function() {
        it("sets the aggregator addresses correctly", async function() {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    }) 

    describe("fund", async function() {
        it("fails if you don't send enough ETH", async function() {
            // this way to be more explicit
            await expect(fundMe.fund()).to.be.revertedWith("You need to spend more ETH!")
            // another way: await expect(fundMe.fund()).to.be.reverted
        })

        it("updates the amount funded data structure", async function() {
            await fundMe.fund({ value: sendValue} )
            const response = await fundMe.getAddressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("adds funder to the funders array", async function() {
            await fundMe.fund({ value: sendValue} )
            const funder = await fundMe.getFunder(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async function() {
        // before testing our withdraw function, we probably want some money in it so let's do it automatically
        // funded
        beforeEach(async function() {
            await fundMe.fund({value: sendValue})
        })

        it("withdraw ETH from a single founder", async function() {

            // ARRANGE

            // we're getting the starting balance of the fundMe
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            // we're getting the starting balance of the deployer so we can estimate later on 
            // how much this numbers have changed
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            // ACT
            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait()

            // pulling out gas objects out of transactionReceipt object
            const {gasUsed, effectiveGasPrice} = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            // Now we should see the entire fundMe balance added to the deployer balance
            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)


            // ASSERT

            // Now we can just check to see if numbers work out here

            assert.equal(endingFundMeBalance, 0) // because we withdrew everyting
            assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), 
            endingDeployerBalance.add(gasCost).toString()) // BigNumber.add

            // When we called withdraw, our deployer spent a little bit of gas so this actually isn't accurate,
            // we also need to calculate in the gas cost
        })
        it("allows us to withdraw with multiple funders", async function() {

            // ARRANGE
            const accounts = await ethers.getSigners();
            // we're gonna loop through these accounts 
            // because index 0 is a deployer
            for(let i = 1; i<6; i++) {
                const fundMeConnectedContract = await fundMe.connect(accounts[i])
                await fundMeConnectedContract.fund({value: sendValue})
            }
            const startingFundMeBalance = fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer) 

            // ACT 
            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            const {gasUsed, effectiveGasPrice} = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            // ASSERT 
            // to check if funders array is reset properly
            await expect(fundMe.getFunder(0)).to.be.reverted

            // make sure that all these mappings are correclt updated to zero
            for(let i = 1; i < 6; i++) {
                assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0)
            }
        })

        it("only allows the owner to withdraw the funds", async function() {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(attackerConnectedContract.cheaperWithdraw()).to.be.reverted
        })
    })


})
