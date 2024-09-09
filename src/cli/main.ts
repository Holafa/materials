import inquirer from 'inquirer';
import {
  handleAddDevWallet,
  handleCreateAndBuyToken,
  handleFundBuyWallets,
  handleGenerateBuyWallets,
  handleSell,
  handleWithdrawAllSolAndTokensFromBuyWalletsToDevWallet, handleWithdrawDevWallet
} from '../handlers';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { JsonFileDiskStorage } from '../storage/json-disk-storage';
import { DEFAULT_SETTINGS } from '../settings/settings';
import { inquireFundBuyWalletsDistribution } from './inquireFundBuyWalletsDistribution';
import { handleShowWallets } from '../handlers/showWallets';
import { NewTokenMetadata } from '../pump-fun/types';
import { buildBuyPlanByFullWalletBalances, handleBuyTokens } from '../handlers/buyTokens';
import { CONFIG } from '../config';
import { DiskWalletStorage } from '../wallet/disk-wallet-storage';
import { DiskTokenStorage } from '../token/disk-token-storage';
import { ConsoleMessageStream } from '../ux-message/ux-message-stream';
import { NamedWallet } from '../wallet/types';
import path from 'path';
import { buildSellPlanToSellAllAvailableTokensOnDevAndBuyWallets, SellPlan } from '../handlers/sell';

async function menu(): Promise<void> {
  console.log("Menu function is starting...");

  const options = [
    '1. Add DevWallet',
    '2. Generate BuyWallets',
    '3. Fund BuyWallets',
    '4. Show wallets',
    '5. Create and Buy Token',
    '6. Bundle Buy from BuyWallets',
    '7. Withdraw All Tokens and SOL from BuyWallets to the Dev Wallet',
    '8. Sell All Tokens from the Dev Wallet',
    '9. Withdraw all SOL from DevWallet to Withdraw Address'
  ];

  const jsonFileDiskStorage = new JsonFileDiskStorage(path.join(CONFIG.STORAGE_PATH, "cli"));
  const walletStorage = new DiskWalletStorage(jsonFileDiskStorage);
  const tokenStorage = new DiskTokenStorage(jsonFileDiskStorage);
  const settings = DEFAULT_SETTINGS;
  const messageStream = new ConsoleMessageStream();

  while (true) {
    const { option } = await inquirer.prompt<{ option: string }>([{
      type: 'list',
      name: 'option',
      message: 'Select an option:',
      choices: options
    }]);

    switch (option) {
      case options[0]:
        const devWallet = await handleAddDevWallet(walletStorage);
        console.log(`✅ Dev wallet ${devWallet.name} ${devWallet.publicKey.toBase58()} has been created`);
        break;
      case options[1]:
        const { numberOfWallets } = await inquirer.prompt<{ numberOfWallets: string }>([{
          type: 'input',
          name: 'numberOfWallets',
          message: 'Enter the number of BuyWallets to generate:',
          validate: input => !isNaN(Number(input)) && Number(input) > 0 ? true : 'Please enter a valid number greater than 0'
        }]);

        const numWallets = parseInt(numberOfWallets, 10);
        await handleGenerateBuyWallets(numWallets, walletStorage);
        console.log(`✅ New ${numWallets} buy wallets have been created`);
        break;
      case options[2]:
        const distribution = await inquireFundBuyWalletsDistribution('manual', walletStorage);
        await handleFundBuyWallets(distribution, walletStorage, settings, tokenStorage, messageStream);
        console.log('✅ Funds successfully distributed');
        break;
      case options[3]:
        await handleShowWallets(walletStorage, tokenStorage, messageStream);
        break;
      case options[4]:
        const existingTokenData = await tokenStorage.readToken();
        if (existingTokenData) {
          console.error('❌ Token already exists.');
          break;
        }
        const questions = [
          {
            type: 'input',
            name: 'name',
            message: 'Token name:',
            validate: (input: string) => input.trim() ? true : 'Token name cannot be empty'
          },
          {
            type: 'input',
            name: 'ticker',
            message: 'Token ticker:',
            validate: (input: string) => input.trim() ? true : 'Token ticker cannot be empty'
          },
          { type: 'input', name: 'description', message: 'Token description:' },
          { type: 'input', name: 'imagePath', message: 'Path to the image' },
          { type: 'input', name: 'twitterLink', message: 'Twitter link:' },
          { type: 'input', name: 'telegramLink', message: 'Telegram link:' },
          { type: 'input', name: 'websiteLink', message: 'Website link:' }
        ];

        const answers = await inquirer.prompt(questions);
        if (Object.values(answers).some(value => !value)) {
          console.error('All parameters must be provided');
          break;
        }

        const imagePath = answers.imagePath;
        if (!fs.existsSync(imagePath)) {
          console.error(`Image not found ${imagePath}`);
          break;
        }
        const image = await fs.openAsBlob(imagePath);

        const newTokenMetadata: NewTokenMetadata = {
          name: answers.name,
          symbol: answers.ticker,
          description: answers.description,
          image: image,
          twitter: answers.twitterLink,
          telegram: answers.telegramLink,
          website: answers.websiteLink
        };

        const buyPlan = await buildBuyPlanByFullWalletBalances(walletStorage, settings);
        console.log('Buy plan:')
        for (const { wallet, buySolLamportsPowerAmount } of buyPlan) {
          console.log(`${wallet} is going to buy ${Number(buySolLamportsPowerAmount) / LAMPORTS_PER_SOL} SOL worth of token`);
        }
        await handleCreateAndBuyToken(newTokenMetadata, walletStorage, settings, tokenStorage, buyPlan, messageStream);
        break;
      case options[5]:
        await handleBuyTokens(walletStorage, tokenStorage, settings);
        break;
      case options[6]:
        await handleWithdrawAllSolAndTokensFromBuyWalletsToDevWallet(walletStorage, settings, tokenStorage, messageStream);
        console.log('✅ All tokens and SOL from all the buy wallets have been sent to the dev wallet');
        break;
      case options[7]:
        const { buyWallets } = await walletStorage.readWallets();
        const devWalletToSell = await walletStorage.getDevWallet();
        const sellPlan: SellPlan = await buildSellPlanToSellAllAvailableTokensOnDevAndBuyWallets(devWalletToSell, buyWallets, tokenStorage);
        await handleSell(walletStorage, tokenStorage, settings, sellPlan, messageStream);
        break;
      case options[8]:
        const { destinationWallet } = await inquirer.prompt<{ destinationWallet: string }>([{
          type: 'input',
          name: 'destinationWallet',
          message: `Enter the destination wallet address:`
        }]);
        const namedWallet = new NamedWallet("destination", new PublicKey(destinationWallet));
        await handleWithdrawDevWallet(
            namedWallet,
            walletStorage,
            settings,
            tokenStorage,
            messageStream
        );
        break;
      default:
        console.log('Invalid option');
    }
  }
}

async function main() {
  await menu();
}

main().catch((error) => {
  console.error("Error in main function:", error);
});
