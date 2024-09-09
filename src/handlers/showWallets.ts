import { getSolBalance, getTokenBalance } from '../balances/balancemanager';
import { WalletData } from '../wallet/types';
import { WalletStorage } from '../wallet/wallet-storage';
import { TokenStorage } from '../token/token-storage';
import { WalletBalanceMessage, WalletPrivateKeyMessage } from '../ux-message/ux-message';
import { UxMessageStream } from '../ux-message/ux-message-stream';

async function getWalletBalanceMessage(
    walletData: WalletData,
    tokenStorage: TokenStorage
): Promise<WalletBalanceMessage> {
  const balanceSol = await getSolBalance(walletData.publicKey);

  const tokenData = await tokenStorage.readToken();
  let balanceToken: number | undefined = undefined;
  if (tokenData) {
    const tokenBalance = await getTokenBalance(walletData.publicKey, tokenData.mint);
    balanceToken = tokenBalance.uiAmount;
  }

  return new WalletBalanceMessage(
      balanceSol,
      walletData.publicKey,
      walletData.name,
      balanceToken
  );
}

export async function getShowWalletsPrivateKeysMessages(
    walletStorage: WalletStorage
): Promise<WalletPrivateKeyMessage[]> {
  const wallets = await walletStorage.readWallets();
  const { devWallet, buyWallets } = wallets;
  if (!devWallet) {
    return [];
  }
  const messages: WalletPrivateKeyMessage[] = [];
  messages.push(new WalletPrivateKeyMessage(devWallet.name, devWallet.keypair));
  for (const buyWallet of buyWallets) {
    messages.push(new WalletPrivateKeyMessage(buyWallet.name, buyWallet.keypair));
  }
  return messages;
}

export async function getShowWalletsBalancesMessages(
    walletStorage: WalletStorage,
    tokenStorage: TokenStorage
): Promise<WalletBalanceMessage[]> {
  const wallets = await walletStorage.readWallets();
  const { devWallet, buyWallets } = wallets;
  if (!devWallet) {
    return [];
  }
  const messages = [];
  messages.push(await getWalletBalanceMessage(devWallet, tokenStorage));

  for (const buyWallet of buyWallets) {
    messages.push(await getWalletBalanceMessage(buyWallet, tokenStorage));
  }

  return messages;
}

export async function handleShowWallets(
    walletStorage: WalletStorage,
    tokenStorage: TokenStorage,
    messageStream: UxMessageStream
) {
  const walletBalanceMessages = await getShowWalletsBalancesMessages(walletStorage, tokenStorage);
  for (const walletBalanceMessage of walletBalanceMessages) {
    await messageStream.sendMessage(walletBalanceMessage);
  }
}
