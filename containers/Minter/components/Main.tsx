import {useState, useEffect} from 'react'
import {EState, MbButton, MbText} from 'mintbase-ui'
import {FormProvider, useForm} from 'react-hook-form'
import {MetadataField} from 'mintbase'

import {useWallet} from "../../../services/providers/WalletProvider"
import {EInputType} from '../utils/types'
import MintForm from './MintForm';

const Main = () => {
    const {wallet, isConnected, signIn} = useWallet()
    const [isMinting, setIsMinting] = useState(false)

    const store = process.env.NEXT_PUBLIC_STORE_ID || ''

    const [products, setProducts] = useState([]);
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const url = 'https://back.chainlib.xyz/api/marketplace?lang=ro&currency=5'
        await fetch(url)
            .then((res) => res.json())
            .then((data) => {
                console.log(data)
                setProducts(data);
            })
    };

    const methods = useForm({
        defaultValues: {
            [EInputType.TITLE]: '',
            [EInputType.DESCRIPTION]: '',
            [EInputType.MINT_AMOUNT]: 1,
            [EInputType.CATEGORY]: null,
            [EInputType.LOCATION]: null,
            [EInputType.MAIN_IMAGE]: null,
            [EInputType.FOREVER_MEDIA]: null,
            [EInputType.FOREVER_DOCUMENT]: null,
            [EInputType.TAGS]: null,
            [EInputType.WEBSITE]: null,
            [EInputType.CALENDAR]: null,
            [EInputType.FOREVER_ROYALTIES]: null,
            [EInputType.SPLIT_REVENUE]: null,
            [EInputType.CUSTOM_KEY_VALUE]: null,
        },
        mode: 'onSubmit',
    })

    const [isActive, setIsActive] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleClick = (key, product) => {
        let description = 'ID - ' + product.product.id;
        description += '\n' + 'Title - ' + product.product.translation.name + ' ';
        description += '\n' + 'Code - ' + product.product.code;

        for (let property in product.properties) {
            description += '\n' + property + ' - ' + product.properties[property]
        }
        setIsActive(current => key);
        setTitle(product.product.translation.name);
        setDescription(description);
    };

    const {handleSubmit, getValues, formState: {errors}} = methods

    const onSubmit = async (data: { [x: string]: any }) => {
        setIsMinting(true)

        try {
            const file = getValues(EInputType.MAIN_IMAGE)
            const {data: fileUploadResult, error: fileError} =
                await wallet.minter.uploadField(MetadataField.Media, file)
            if (fileError) {
                throw new Error(fileError)
            }
        } catch (error) {
            console.error(error)
            // TODO: handle error
        }

        try {
            const file = getValues(EInputType.FOREVER_MEDIA)
            if (file) {
                const {data: fileUploadResult, error: fileError} =
                    await wallet.minter.uploadField(MetadataField.Animation_url, file)
                if (fileError) {
                    throw new Error(fileError)
                }
            }
        } catch (error) {
            console.error(error)
            // TODO: handle error
        }

        try {
            const file = getValues(EInputType.FOREVER_DOCUMENT)
            console.log(file)
            if (file) {
                const {data: fileUploadResult, error: fileError} =
                    await wallet.minter.uploadField(MetadataField.Document, file)

                if (fileError) {
                    throw new Error(fileError)
                }
            }
        } catch (error) {
            console.error(error)
            // TODO: handle error
        }

        let extra: any[] = []

        try {
            wallet.minter.setField(MetadataField.Tags, data[EInputType.TAGS])
        } catch (error) {
            console.error(error)
            // TODO: handle error here
        }

        const mintAmount = data[EInputType.MINT_AMOUNT]
        const category = data[EInputType.CATEGORY]

        const metadata = {
            // title: data[EInputType.TITLE],
            // description: data[EInputType.DESCRIPTION],
            title: title,
            description: description,
            extra,
            store,
            type: 'NEP171',
            category,
        }

        wallet.minter.setMetadata(metadata, true)

        const royalties = data[EInputType.FOREVER_ROYALTIES]
        const splits = data[EInputType.SPLIT_REVENUE]

        const {data: metadataId, error} = await wallet.minter.getMetadataId()

        if (error) {
            // TODO: throw error
            return
        }

        await wallet.mint(
            Number(mintAmount),
            store.toString(),
            !royalties ? undefined : royalties.royaltyArgs,
            !splits ? undefined : splits,
            category,
            {
                callbackUrl: `${window.location.origin}/success`,
                meta: JSON.stringify({
                    type: 'mint',
                    args: {
                        contractAddress: store.toString(),
                        amount: Number(mintAmount),
                        thingId: `${metadataId}:${store.toString()}`,
                    },
                }),
                royaltyPercentage: royalties?.percentage || 0,
                metadataId,
            }
        )
        setIsMinting(false)
    }

    const hasErrors = Object.keys(errors).length > 0

    return (
        <div className=" flex flex-col justify-center items-center">
            {!isConnected && (
                <div className="w-full flex flex-col justify-center items-center space-y-8">
                    <div className='flex flex-col justify-center items-center space-y-8'>
                        <MbText className="text-3xl border-gray-100">
                            Simple Minter
                        </MbText>

                        <MbText className="text-xl">
                            A simple NFT Minter on Mintbase
                        </MbText>

                    </div>
                    <div>
                        <MbButton onClick={signIn} label="Connect NEAR Wallet to Mint"/>
                    </div>
                </div>
            )}

            <div className="space-y-4 ">
                {isConnected && (
                    <div className="flex flex-col items-center justify-center mt-2">
                        <MbText className="text-3xl">
                            Mint your NFTs
                        </MbText>
                        <div className="grid grid-cols-2 gap-2">
                            <div className='item-container'>
                                {products.map((product, key) => (
                                    <div className={isActive == key ? 'bg-salmon' : 'card'}
                                         onClick={() => handleClick(key, product)}>
                                        {product.product.main_image && (
                                            <img
                                                src={'https://back.chainlib.xyz/images/products/sm/' + product.product.main_image.src}
                                                alt=""/>
                                        )}
                                        {product.product.main_image && (
                                            <p>
                                                <a href={'https://back.chainlib.xyz/download/image/' + product.product.main_image.src}
                                                   download type="application/octet-stream">
                                                    <small>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor"
                                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                                  stroke-width="2"
                                                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                                        </svg>
                                                    </small>
                                                </a>
                                            </p>
                                        )}

                                        <p>{product.product.translation.name}</p>

                                    </div>
                                ))}
                            </div>
                            <div className="w-full mt-4 space-y-4">
                                <FormProvider {...methods}>
                                    <form onSubmit={handleSubmit(onSubmit, (errors) => console.error(errors))}>

                                        <MintForm text={title} description={description}/>

                                        <div className="flex justify-center items-center mt-4">

                                            <MbButton
                                                type="submit"
                                                label="Mint Me"
                                                disabled={hasErrors}
                                                state={
                                                    hasErrors
                                                        ? EState.DISABLED
                                                        : isMinting
                                                            ? EState.LOADING
                                                            : EState.ACTIVE
                                                }
                                            />
                                        </div>
                                    </form>
                                </FormProvider>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Main;
