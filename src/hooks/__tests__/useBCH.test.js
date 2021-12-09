/* eslint-disable no-native-reassign */
import useBCH from '../useBCH';
import mockReturnGetHydratedUtxoDetails from '../__mocks__/mockReturnGetHydratedUtxoDetails';
import mockReturnGetSlpBalancesAndUtxos from '../__mocks__/mockReturnGetSlpBalancesAndUtxos';
import mockReturnGetHydratedUtxoDetailsWithZeroBalance from '../__mocks__/mockReturnGetHydratedUtxoDetailsWithZeroBalance';
import mockReturnGetSlpBalancesAndUtxosNoZeroBalance from '../__mocks__/mockReturnGetSlpBalancesAndUtxosNoZeroBalance';
import sendBCHMock from '../__mocks__/sendBCH';
import createTokenMock from '../__mocks__/createToken';
import mockTxHistory from '../__mocks__/mockTxHistory';
import mockFlatTxHistory from '../__mocks__/mockFlatTxHistory';
import mockTxDataWithPassthrough from '../__mocks__/mockTxDataWithPassthrough';
import {
    flattenedHydrateUtxosResponse,
    legacyHydrateUtxosResponse,
} from '../__mocks__/mockHydrateUtxosBatched';
import {
    tokenSendWdt,
    tokenReceiveGarmonbozia,
    tokenReceiveTBS,
    tokenGenesisCashtabMintAlpha,
} from '../__mocks__/mockParseTokenInfoForTxHistory';
import {
    mockSentCashTx,
    mockReceivedCashTx,
    mockSentTokenTx,
    mockReceivedTokenTx,
    mockSentOpReturnMessageTx,
    mockReceivedOpReturnMessageTx,
} from '../__mocks__/mockParsedTxs';
import BCHJS from '@psf/bch-js'; // TODO: should be removed when external lib not needed anymore
import { currency } from '../../components/Common/Ticker';
import BigNumber from 'bignumber.js';
import { fromSmallestDenomination } from '@utils/cashMethods';

describe('useBCH hook', () => {
    it('gets Rest Api Url on testnet', () => {
        process = {
            env: {
                REACT_APP_NETWORK: `testnet`,
                REACT_APP_BCHA_APIS:
                    'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
                REACT_APP_BCHA_APIS_TEST:
                    'https://free-test.fullstack.cash/v3/',
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://free-test.fullstack.cash/v3/`;
        expect(getRestUrl(0)).toBe(expectedApiUrl);
    });

    it('gets primary Rest API URL on mainnet', () => {
        process = {
            env: {
                REACT_APP_BCHA_APIS:
                    'https://rest.kingbch.com/v3/,https://wallet-service-prod.bitframe.org/v3/,notevenaurl,https://rest.kingbch.com/v3/',
                REACT_APP_NETWORK: 'mainnet',
            },
        };
        const { getRestUrl } = useBCH();
        const expectedApiUrl = `https://rest.kingbch.com/v3/`;
        expect(getRestUrl(0)).toBe(expectedApiUrl);
    });

    it('calculates fee correctly for 2 P2PKH outputs', () => {
        const { calcFee } = useBCH();
        const BCH = new BCHJS();
        const utxosMock = [{}, {}];

        expect(calcFee(BCH, utxosMock, 2, 1.01)).toBe(378);
    });

    it('gets SLP and BCH balances and utxos from hydrated utxo details', async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();
        const result = await getSlpBalancesAndUtxos(
            BCH,
            mockReturnGetHydratedUtxoDetails,
        );

        expect(result).toStrictEqual(mockReturnGetSlpBalancesAndUtxos);
    });

    it(`Ignores SLP utxos with utxo.tokenQty === '0'`, async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();

        const result = await getSlpBalancesAndUtxos(
            BCH,
            mockReturnGetHydratedUtxoDetailsWithZeroBalance,
        );

        expect(result).toStrictEqual(
            mockReturnGetSlpBalancesAndUtxosNoZeroBalance,
        );
    });

    it(`Parses flattened batched hydrateUtxosResponse to yield same result as legacy unbatched hydrateUtxosResponse`, async () => {
        const { getSlpBalancesAndUtxos } = useBCH();
        const BCH = new BCHJS();

        const batchedResult = await getSlpBalancesAndUtxos(
            BCH,
            flattenedHydrateUtxosResponse,
        );

        const legacyResult = await getSlpBalancesAndUtxos(
            BCH,
            legacyHydrateUtxosResponse,
        );

        expect(batchedResult).toStrictEqual(legacyResult);
    });

    it('sends XEC correctly', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            destinationAddress,
            sendAmount,
        } = sendBCHMock;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(
            await sendXec(
                BCH,
                wallet,
                utxos,
                currency.defaultFee,
                '',
                false,
                null,
                destinationAddress,
                sendAmount,
            ),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
        expect(BCH.RawTransactions.sendRawTransaction).toHaveBeenCalledWith(
            expectedHex,
        );
    });

    it('sends one to many XEC correctly', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const {
            expectedTxId,
            expectedHex,
            utxos,
            wallet,
            destinationAddress,
            sendAmount,
        } = sendBCHMock;

        const addressAndValueArray = [
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6.8',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,7',
            'bitcoincash:qrzuvj0vvnsz5949h4axercl5k420eygavv0awgz05,6',
        ];

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(
            await sendXec(
                BCH,
                wallet,
                utxos,
                currency.defaultFee,
                '',
                true,
                addressAndValueArray,
            ),
        ).toBe(`${currency.blockExplorerUrl}/tx/${expectedTxId}`);
    });

    it(`Throws error if called trying to send one base unit ${currency.ticker} more than available in utxo set`, async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const { expectedTxId, utxos, wallet, destinationAddress } = sendBCHMock;

        const expectedTxFeeInSats = 229;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        const oneBaseUnitMoreThanBalance = new BigNumber(utxos[0].value)
            .minus(expectedTxFeeInSats)
            .plus(1)
            .div(10 ** currency.cashDecimals)
            .toString();

        const failedSendBch = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            oneBaseUnitMoreThanBalance,
        );
        expect(failedSendBch).rejects.toThrow(new Error('Insufficient funds'));
        const nullValuesSendBch = await sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            null,
        );
        expect(nullValuesSendBch).toBe(null);
    });

    it('Throws error on attempt to send one satoshi less than backend dust limit', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const { expectedTxId, utxos, wallet, destinationAddress } = sendBCHMock;
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        const failedSendBch = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            new BigNumber(
                fromSmallestDenomination(currency.dustSats).toString(),
            )
                .minus(new BigNumber('0.00000001'))
                .toString(),
        );
        expect(failedSendBch).rejects.toThrow(new Error('dust'));
        const nullValuesSendBch = await sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            null,
        );
        expect(nullValuesSendBch).toBe(null);
    });

    it('receives errors from the network and parses it', async () => {
        const { sendXec } = useBCH();
        const BCH = new BCHJS();
        const { sendAmount, utxos, wallet, destinationAddress } = sendBCHMock;
        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('insufficient priority (code 66)');
            });
        const insufficientPriority = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(insufficientPriority).rejects.toThrow(
            new Error('insufficient priority (code 66)'),
        );

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('txn-mempool-conflict (code 18)');
            });
        const txnMempoolConflict = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(txnMempoolConflict).rejects.toThrow(
            new Error('txn-mempool-conflict (code 18)'),
        );

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                throw new Error('Network Error');
            });
        const networkError = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(networkError).rejects.toThrow(new Error('Network Error'));

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockImplementation(async () => {
                const err = new Error(
                    'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
                );
                throw err;
            });

        const tooManyAncestorsMempool = sendXec(
            BCH,
            wallet,
            utxos,
            currency.defaultFee,
            '',
            false,
            null,
            destinationAddress,
            sendAmount,
        );
        await expect(tooManyAncestorsMempool).rejects.toThrow(
            new Error(
                'too-long-mempool-chain, too many unconfirmed ancestors [limit: 25] (code 64)',
            ),
        );
    });

    it('creates a token correctly', async () => {
        const { createToken } = useBCH();
        const BCH = new BCHJS();
        const { expectedTxId, expectedHex, wallet, configObj } =
            createTokenMock;

        BCH.RawTransactions.sendRawTransaction = jest
            .fn()
            .mockResolvedValue(expectedTxId);
        expect(await createToken(BCH, wallet, 5.01, configObj)).toBe(
            `${currency.tokenExplorerUrl}/tx/${expectedTxId}`,
        );
        expect(BCH.RawTransactions.sendRawTransaction).toHaveBeenCalledWith(
            expectedHex,
        );
    });

    it('Throws correct error if user attempts to create a token with an invalid wallet', async () => {
        const { createToken } = useBCH();
        const BCH = new BCHJS();
        const { invalidWallet, configObj } = createTokenMock;

        const invalidWalletTokenCreation = createToken(
            BCH,
            invalidWallet,
            currency.defaultFee,
            configObj,
        );
        await expect(invalidWalletTokenCreation).rejects.toThrow(
            new Error('Invalid wallet'),
        );
    });

    it('Correctly flattens transaction history', () => {
        const { flattenTransactions } = useBCH();
        expect(flattenTransactions(mockTxHistory, 10)).toStrictEqual(
            mockFlatTxHistory,
        );
    });

    it(`Correctly parses a "send ${currency.ticker}" transaction`, () => {
        const { parseTxData } = useBCH();
        expect(parseTxData([mockTxDataWithPassthrough[0]])).toStrictEqual(
            mockSentCashTx,
        );
    });

    it(`Correctly parses a "receive ${currency.ticker}" transaction`, () => {
        const { parseTxData } = useBCH();
        expect(parseTxData([mockTxDataWithPassthrough[5]])).toStrictEqual(
            mockReceivedCashTx,
        );
    });

    it(`Correctly parses a "send ${currency.tokenTicker}" transaction`, () => {
        const { parseTxData } = useBCH();
        expect(parseTxData([mockTxDataWithPassthrough[1]])).toStrictEqual(
            mockSentTokenTx,
        );
    });

    it(`Correctly parses a "receive ${currency.tokenTicker}" transaction`, () => {
        const { parseTxData } = useBCH();
        expect(parseTxData([mockTxDataWithPassthrough[3]])).toStrictEqual(
            mockReceivedTokenTx,
        );
    });

    it(`Correctly parses a "send ${currency.tokenTicker}" transaction with token details`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenSendWdt.parsedTx,
                tokenSendWdt.tokenInfo,
            ),
        ).toStrictEqual(tokenSendWdt.cashtabTokenInfo);
    });

    it(`Correctly parses a "receive ${currency.tokenTicker}" transaction with token details and 9 decimals of precision`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenReceiveTBS.parsedTx,
                tokenReceiveTBS.tokenInfo,
            ),
        ).toStrictEqual(tokenReceiveTBS.cashtabTokenInfo);
    });

    it(`Correctly parses a "receive ${currency.tokenTicker}" transaction from an HD wallet (change address different from sending address)`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenReceiveGarmonbozia.parsedTx,
                tokenReceiveGarmonbozia.tokenInfo,
            ),
        ).toStrictEqual(tokenReceiveGarmonbozia.cashtabTokenInfo);
    });

    it(`Correctly parses a "GENESIS ${currency.tokenTicker}" transaction with token details`, () => {
        const { parseTokenInfoForTxHistory } = useBCH();
        const BCH = new BCHJS();
        expect(
            parseTokenInfoForTxHistory(
                BCH,
                tokenGenesisCashtabMintAlpha.parsedTx,
                tokenGenesisCashtabMintAlpha.tokenInfo,
            ),
        ).toStrictEqual(tokenGenesisCashtabMintAlpha.cashtabTokenInfo);
    });

    it(`Correctly parses a "send ${currency.ticker}" transaction with an OP_RETURN message`, () => {
        const { parseTxData } = useBCH();
        expect(parseTxData([mockTxDataWithPassthrough[10]])).toStrictEqual(
            mockSentOpReturnMessageTx,
        );
    });

    it(`Correctly parses a "receive ${currency.ticker}" transaction with an OP_RETURN message`, () => {
        const { parseTxData } = useBCH();
        expect(parseTxData([mockTxDataWithPassthrough[11]])).toStrictEqual(
            mockReceivedOpReturnMessageTx,
        );
    });
});
