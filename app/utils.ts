import {
  toWebAuthnPubKey,
  toWebAuthnSigner,
  toECDSASigner,
  WebAuthnMode,
  WebAuthnKey,
  createWeightedValidator,
  SIGNER_TYPE,
  createWeightedKernelAccountClient,
} from "@zerodev/weighted-validator";
import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
} from "@zerodev/sdk";
import { Address, PrivateKeyAccount, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { WeightedSigner } from "@zerodev/weighted-validator";

export const PASSKEY_URL =
  "https://passkeys.zerodev.app/api/v3/cd5209db-ce82-4405-87a7-3447aae3743f";
export const BUNDLER_URL =
  "https://rpc.zerodev.app/api/v2/bundler/cd5209db-ce82-4405-87a7-3447aae3743f";
export const PAYMASTER_URL =
  "https://rpc.zerodev.app/api/v2/paymaster/cd5209db-ce82-4405-87a7-3447aae3743f";
export const entryPoint = ENTRYPOINT_ADDRESS_V07;
export const chain = sepolia;
export const publicClient = createPublicClient({
  transport: http(BUNDLER_URL),
  chain,
});

export const registerAndFetchPassKeyPublicKey = async (
  passkeyName: string
): Promise<WebAuthnKey> => {
  return await toWebAuthnPubKey({
    passkeyName,
    passkeyServerUrl: PASSKEY_URL,
    mode: WebAuthnMode.Register,
  });
};

export const loginAndFetchPassKeyPublicKey = async (
  passkeyName: string
): Promise<WebAuthnKey> => {
  return await toWebAuthnPubKey({
    passkeyName,
    passkeyServerUrl: PASSKEY_URL,
    mode: WebAuthnMode.Login,
  });
};

export const createWeightedAccountClient = async (
  signer: WeightedSigner,
  ecdsaSignerAddress: Address,
  publicKey: WebAuthnKey
) => {
  const multiSigValidator = await createWeightedValidator(publicClient, {
    entryPoint,
    signer,
    config: {
      threshold: 100,
      signers: [
        {
          publicKey: ecdsaSignerAddress,
          weight: 50,
        },
        {
          publicKey,
          weight: 100,
        },
      ],
    },
  });

  const account = await createKernelAccount(publicClient, {
    entryPoint,
    plugins: {
      sudo: multiSigValidator,
    },
  });

  const paymasterClient = createZeroDevPaymasterClient({
    entryPoint,
    chain,
    transport: http(PAYMASTER_URL),
  });

  const client = createWeightedKernelAccountClient({
    account,
    entryPoint,
    chain,
    bundlerTransport: http(BUNDLER_URL),
    middleware: {
      sponsorUserOperation: paymasterClient.sponsorUserOperation,
    },
  });
  return client;
};
