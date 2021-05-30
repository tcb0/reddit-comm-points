/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const chalk = require("chalk");
const { config, ethers, tenderly, run } = require("hardhat");
const R = require("ramda");
const { getTxData } = require('./benchmarkLib')
const distributions = require("../artifacts/contracts/Distributions.sol/Distributions_v0.json");


const filterFiles = (readDirPath, batchType, round) => {
    const files = fs.readdirSync(readDirPath);
    const newFiles = [];
    for (let file of files) {
        if (!file.startsWith(batchType) || (round && !file.includes(round))) {
            continue;
        }

        newFiles.push(file);
    }
    return newFiles;
}

const batchMint = async (readDirPath, writeDirPath, batchType, round) => {

    console.log("\n\n 📡 Batch minting reddit points...\n");
    const deployerWallet = ethers.provider.getSigner();
    const deployerWalletAddress = await deployerWallet.getAddress();
    console.log("Deployer address", deployerWalletAddress);

    let contractAddresses;
    try {
        contractAddresses = fs.readFileSync('contract_addresses.json', 'utf8')
        contractAddresses = JSON.parse(contractAddresses);
    } catch (e) {
        throw Error("Could  not read contract addresses", e)
    }

    let txHashData = {}
    let nonce = await deployerWallet.getTransactionCount();

    const dist = new ethers.Contract(contractAddresses.distributionAddress, distributions['abi'], deployerWallet);

    let compressedData = {

    };

    let index = 0;

    const files = filterFiles(readDirPath, batchType, round);

    for (let file of files) {

        let binaryData = fs.readFileSync(`${readDirPath}/${file}`);
        const bytes = Buffer.byteLength(binaryData);
        console.info(chalk.blueBright(`minting ${file}, bytes: ${bytes}`));

        let binDataHex = "0x" + binaryData.toString("hex");
        const mintingTxHash = (await dist.batchMint(
            binDataHex,
            {
                gasLimit: ethers.BigNumber.from(10000000000000),
                nonce,
                gasPrice: 0
            }
        )).hash;
        txHashData[index] = {
            txHash: mintingTxHash,
            fileName: file,
            bytes: bytes
        }
        compressedData[file] = {
            bytes: bytes,
            txHash: mintingTxHash
        }
        console.log("tx minted", mintingTxHash);
        nonce += 1
        index += 1;
    }

    fs.writeFileSync(`${writeDirPath}/compressedDataMonths.json`, JSON.stringify(compressedData), 'utf-8');

    fs.writeFileSync(`${writeDirPath}/txHashData.json`, JSON.stringify(txHashData), 'utf-8');

    let txData = await getTxData(txHashData);
    fs.writeFileSync(`${writeDirPath}/txData.json`, JSON.stringify(txData), 'utf-8');
    console.info("Done batch minting.");

};



const main = async () => {

    console.log("Batch minting data...")

    console.log("Batch minting bricks data full...")

    const batchType1 = 'b1'
    const batchType2 = 'b2'
    const readDirBricks = 'reddit-data-encoded/bricks'
    const writeDirBricks = 'batch-minting/bricks'
    const round = 'round_1_'

    await batchMint(readDirBricks, writeDirBricks, batchType1, round)


};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });