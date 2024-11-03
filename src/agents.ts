import OpenAI from 'openai';
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

interface TokenOperation {
  createToken: (name: string, symbol: string, initialSupply: number) => Promise<string>;
  transferAsset: (amount: number, assetId: string, destinationAddress: string) => Promise<string>;
  getBalance: (assetId: string) => Promise<number>;
  swapAssets: (amountIn: number, fromAssetId: string, toAssetId: string) => Promise<string>;
}

interface NFTOperation {
  deployNFT: (name: string, symbol: string, baseUri: string) => Promise<string>;
  mintNFT: (contractAddress: string, mintTo: string) => Promise<string>;
}

interface Utilities {
  requestEthFromFaucet: () => Promise<string>;
  generateArt: (prompt: string) => Promise<string>;
}

class BasedAgent implements TokenOperation, NFTOperation, Utilities {
  private cdp: Coinbase;
  private openai: OpenAI;
  private wallet: Wallet | null = null;

  constructor() {
    if (!process.env.WALLET_PATH) {
      throw new Error('WALLET_PATH environment variable is required');
    }

    this.cdp = new Coinbase({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_PRIVATE_KEY!
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async initWallet() {
    if (!this.wallet) {
      this.wallet = await Wallet.create();
    }
  }

  

  async createToken(name: string, symbol: string, totalSupply: number): Promise<string> {
    // Implementation using CDP SDK
    await this.initWallet();
    const deployedToken = await this.wallet!.deployToken({ name, symbol, totalSupply });
    await deployedToken.wait();
    return `Token ${name} (${symbol}) has been created with a total supply of ${totalSupply} and is deployed at ${deployedToken.getContractAddress()}`;
  }

  async transferAsset(amount: number, assetId: string, destination: string): Promise<string> {
    try {
      await this.initWallet();
      
      // Check if we're on Base Mainnet and the asset is USDC for gasless transfer
      const isMainnet = this.wallet!.getNetworkId() === "base-mainnet";
      const isUsdc = assetId.toLowerCase() === "usdc";
      const gasless = isMainnet && isUsdc;

      // For ETH and USDC, we can transfer directly without checking balance
      if (["eth", "usdc"].includes(assetId.toLowerCase())) {
        const transfer = await this.wallet!.createTransfer({
          amount,
          assetId,
          destination,
          gasless
        });
        await transfer.wait();
        const gaslessMsg = gasless ? " (gasless)" : "";
        return `Transferred ${amount} ${assetId}${gaslessMsg} to ${destination}`;
      }

      // For other assets, check balance first
      try {
        const balance = await this.wallet!.getBalance(assetId);
        
        if (Number(balance) < amount) {
          throw new Error(`Insufficient balance. You have ${balance} ${assetId}, but tried to transfer ${amount}.`);
        }

        const transfer = await this.wallet!.createTransfer({
          amount,
          assetId,
          destination
        });
        await transfer.wait();
        return `Transferred ${amount} ${assetId} to ${destination}`;

      } catch (error) {
        if (error instanceof UnsupportedAssetError) {
          throw new Error(
            `The asset ${assetId} is not supported on this network. It may have been recently deployed. Please try again in about 30 minutes.`
          );
        }
        throw error;
      }
    } catch (error: Error | any) {
      throw new Error(
        `Error transferring asset: ${error?.message}. If this is a custom token, it may have been recently deployed. Please try again in about 30 minutes, as it needs to be indexed by CDP first.`
      );
    }
  }

  async getBalance(assetId: string): Promise<number> {
  try{
    await this.initWallet();
    const balance = await this.wallet!.getBalance(assetId);
    return Number(balance);
    } catch (error: Error | any) {
      throw new Error(
        `Error getting balance for asset: ${error?.message}.`
      );
    }
  }

  async deployNFT(name: string, symbol: string, baseURI: string): Promise<string> {
    // Implementation using CDP SDK
    await this.initWallet();
    const deployedNFT = await this.wallet!.deployNFT({ name, symbol, baseURI });
    await deployedNFT.wait();
    return `NFT ${name} (${symbol}) has been created and is deployed at ${deployedNFT.getContractAddress()}`;
  }

  async mintNFT(contractAddress: string, mintTo: string): Promise<string> {
    // Implementation using CDP SDK
    await this.initWallet();
    const args = {
      to: mintTo,
      quantity: 1
    };
    const mintedNFT = await this.wallet!.invokeContract({ contractAddress, method: "mint", args });
    await mintedNFT.wait();
    return `Successfully minted NFT at ${mintTo}`;
  }

  async requestEthFromFaucet(): Promise<string> {
    // Implementation using CDP SDK
    await this.initWallet();
    const networkId = this.wallet!.getNetworkId();
    if (networkId !== "base-sepolia") {
      throw new Error("This operation is only supported on Base Sepolia Testnet.");
    }
    const faucet = await this.wallet!.faucet();
    await faucet.wait();
    return "Successfully requested ETH from faucet";
  }

  async generateArt(prompt: string): Promise<string> {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });
      
      const imageUrl = response.data[0].url;
      return `Generated artwork available at: ${imageUrl}`;
    } catch (error: Error | any) {
      throw new Error(`Error generating artwork: ${error?.message}`);
    }
  }

  async swapAssets(amountIn: number, fromAssetId: string, toAssetId: string): Promise<string> {
    try {
      await this.initWallet();
      
      // Check if we have sufficient balance
      const balance = await this.wallet!.getBalance(fromAssetId);
      if (Number(balance) < amountIn) {
        throw new Error(`Insufficient balance. You have ${balance} ${fromAssetId}, but tried to swap ${amountIn}.`);
      }

      // Create and execute the swap
      const swap = await this.wallet!.createTrade({
        amount:amountIn,
        fromAssetId,
        toAssetId
      });

      await swap.wait();
      
      // Get the amount received from the swap result
      const amountOut = swap.getToAmount();
      
      return `Successfully swapped ${amountIn} ${fromAssetId} for ${amountOut} ${toAssetId}`;
    } catch (error: Error | any) {
      throw new Error(
        `Error swapping assets: ${error?.message}. Make sure both tokens exist and have sufficient liquidity.`
      );
    }
  }
}

class UnsupportedAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedAssetError';
  }
}

export default BasedAgent; 