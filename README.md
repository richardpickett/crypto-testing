# Crypto Testing

This is a quick demonstration of several encryption principles, using nodejs

## Table of Contents

- [Setup](#Setup)
- [Important Directories](#Important-Directories)
- [Commander](#Commander)
- [Exercise](#Exercise)
- [The Encrypted File](#The-Encrypted-File)
- [Bonus Reminder](#Bonus-Reminder)

## Setup

`nvm install # respect the .nvmrc file`

`npm ci # install all the dependent packages`

## Important Directories

`src` All the source files are located here

`keys` Your private and public keys will be stored here, `.gitignore` is set to not commit your private keys, public keys are to be committed as part of the exercise.

`texts` Decrypted and encrypted text files are stored here and are intentionally committed to the repo as part of the exercise.

## Commander

This project was built with `commander`, so you can play around with the command line like this:

`node src/index.js` <- and add additional commands to the end

Running the above command all by itself will automatically output help information indicating what additional commands can be executed.

```bash
rpickett@p7560:~/workspace/richardpickett/crypto-testing$ node src/index.js
Usage: index [options] [command]

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  createKeyPair [options]
  encryptFile [options]
  decryptFile [options]
  help [command]           display help for command
```

If you run a command and don't pass the correct parameters, `Commander` automatically prints out help text.

## Exercise

_Note, you can do this as a solo exercise by opening two terminals to simulate two people. No need to do the `git commit` commands in this case._

### 1. Setup your name in the environment

This will allow you to copy/paste all the below commands without having to edit them and put your name in:

`NAME=<put your unique name here, no spaces>`

### 2. Create your own key pair

`node src/index.js createKeyPair -k ${NAME}`

If you want, you can now `ls keys` and you should see two new files with your `NAME`, one `.pub` and one `.priv`:

`ls keys/${NAME}.*`

### 3. Commit your public key to the repo

`git add keys/${NAME}.pub && git commit -m "Adding ${NAME} public key" && git push`

### 4. Get a partner

Pair up with someone else who has also committed their public key

Enter their name to your environment so you can easily copy/paste commands without having to edit them and put their name in:

`PARTNER=<put their name here>`

You may want to confirm their name matches a `keys/<their name>.pub` file.

`git pull` until you see their `.pub` file show up.

### 5. Encrypt a file for them

`node src/index.js encryptFile -k ${PARTNER} -f texts/lorum_ipsum.txt`

This will encrypt a file for them that only their private key can decrypt.

`ls texts/lorum_ipsum.txt.${PARTNER}.json`

Now push it up to the repo:

`git add texts/lorum_ipsum.txt.${PARTNER}.json && git commit -m "Adding ${PARTNER} encrypted file" && git push`

Once they've done the same, you can now `git pull` to get your own encrypted file.

`ls texts/lorum_ipsum.txt.${NAME}.json`

### 6. Decrypt the file they sent

`node src/index.js decryptFile -k ${NAME} -f texts/lorum_ipsum.txt.${NAME}.json`

You should see the lorum ipsum text displayed

### 7. Encrypt and sign a file to them

This step will not only encrypt the data using their public key, it will also add a signature signed by your private key that they can use to verify you sent it to them.

`node src/index.js encryptFile -k ${PARTNER} -s ${NAME} -f texts/lorum_ipsum.txt`

You should now see a new file encrypted and signed:

`ls texts/lorum_ipsum.txt.${PARTNER}.${NAME}.json`

Now push it up to the repo:

`git add texts/lorum_ipsum.txt.${PARTNER}.${NAME}.json && git commit -m "Adding ${PARTNER} encrypted file signed by ${NAME}" && git push`

Once they've done the same, you can now `git pull` to get your own encrypted and signed file.

`ls texts/lorum_ipsum.txt.${NAME}.${PARTNER}.json`

### 8. Decrypt and Verify the encrypted and signed file

`node src/index.js decryptFile -k ${NAME} -f texts/lorum_ipsum.txt.${NAME}.${PARTNER}.json`

Notice, this is the same command as the normal decrypt on step 6, the decrypt code sees that the file has a signature and automatically checks the signature before trying to decrypt it.

You should see this additional line:

`[2023-09-30T05:24:35.134Z] [SUCCESS]  Validated Signature`

### 9. Spot the big gaping security hole in this method

Bonus points if you can spot the big security hole in using this specific method of communication.

### 10. Let's see if we can change the signatory to produce a failure

Edit the file your partner signed and sent to you, `texts/lorum_ipsum.txt.${NAME}.${PARTNER}.json`.

It's just json, so feel free to let your editor reformat it to make it easier to use.

Look for the key `signatory` and change it to any of the other names you see in the keys directory, for example you can use mine, `richardPickett`.

It's important you get the name right or it will throw an error like this, which won't actually test the signature:

`[2023-09-30T04:40:36.972Z] [ERROR]  Signature File Does Not Exist`

If you've done it correctly, it will have this error:

`[2023-09-30T04:42:28.174Z] [ERROR]  Invalid Signature`

## The Encrypted File

You may have noticed, the "encrypted" file is not actually encrypted, it's plaintext JSON.

It's the data inside the JSON that is encrypted, here's some info on those fields and how this works.

When you create your key pair on step 2, you have a private key and a public key.

The public key can be shared with anyone. The worst thing they can do with it is encrypt data that only your private key can decrypt.

Think of it this way, your public key allows people to make a lock (like a padlock) that only your private key can open.

In "real life" you'll want to protect your private keys. Besides not sharing them and not having copies of them, a common practice is to further encrypt them with a strong password, where you can only use them if you supply a password. We didn't do that here since this is just for demo purposes.

In an encrypted, unsigned file, you find two fields, `encryptedData` and `encryptedKey`.

With RSA encryption (what's used here, and other algorithms as well) isn't actually used to encrypt the data.

The encryption process is two-step.

In the first step we make a random key and use aes256 to encrypt the data.

That encrypted data is then stored in `encryptedData`.

Then, the pubic key of the person we're sending this file to is used to encrypt the random key, and this is store in `encryptedKey`.

To decrypt, we use the recipient's private key to decrypt the `encryptedKey` and then we use that key to decrypt `encryptedData`.

You may have noticed the code `Buffer.alloc(16, 0)` and the comments about mode and IV. This demo just uses defaults, but in real life encryption streams are constantly changing those settings as they go. It's important that both the sender and receiver keep those values in sync, because not only do you have to have the private key to decrypt the `encryptedkey`, you also have to have the right mode and Initialization Vector in order to decrypt the data.

It's common for encrypted streams to have two channels of communication (they can happen within the single TCP connection). One channel is the "control" channel, which negotiates key, mode, and IV changes as the other channel, "data", is busy sending data back and forth. This makes it harder for an eavesdropper to decrypt the data, because without knowing the mode and IV, they're locked out even if they have the original keys used at the start of the connection.

You may have noticed in the code we verify the signature if there is one, before trying to decrypt the random key or the data. This is good security process. There's no sense in decrypting data if the signature doesn't match.

To create the signature, the signatory's private key (that would be your private key when you're sending a message to someone else) is used to sign _the encrytped random key_. Again, we don't want to have to decrypt anything before checking the signature.

The signature is stored in `signature`, and the signatory (your name when you're encrypting, the other person when you're decrypting) is stored in `signatory`.

Do we have to have the `signatory` field? _No._ But it's nice to have. If you don't know the signatory, you have to load all the public keys you have on hand and test the signature one at a time with each key until you've either found one that works or you've tested them all.

## Bonus Reminder

Did you find the gaping hole in this implementation?

What would you do to resolve it?

Hint: It's the **T** in S.T.R.I.D.E.
