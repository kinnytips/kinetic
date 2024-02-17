import { Keypair } from '@kinny/kinetic-keypair'

// ALisrzsaVqciCxy8r6g7MUrPoRo3CpGxPhwBbZzqZ9bA
export const ALICE_KEY = [
  205, 213, 7, 246, 167, 206, 37, 209, 161, 129, 168, 160, 90, 103, 198, 142, 83, 177, 214, 203, 80, 29, 71, 245, 56,
  152, 15, 8, 235, 174, 62, 79, 138, 198, 145, 111, 119, 33, 15, 237, 89, 201, 122, 89, 48, 221, 224, 71, 81, 128, 45,
  97, 191, 105, 37, 228, 243, 238, 130, 151, 53, 221, 172, 125,
]

// BobQoPqWy5cpFioy1dMTYqNH9WpC39mkAEDJWXECoJ9y
export const BOB_KEY = [
  18, 115, 33, 33, 38, 237, 120, 11, 143, 149, 233, 210, 110, 63, 168, 30, 222, 58, 179, 219, 72, 97, 178, 234, 96, 253,
  41, 76, 58, 178, 196, 71, 160, 132, 126, 143, 172, 202, 194, 16, 114, 76, 228, 235, 255, 88, 90, 195, 224, 74, 167,
  48, 234, 92, 160, 3, 29, 163, 62, 235, 147, 240, 30, 108,
]

// CharYfTvJSiH6LtDpkGUiVVZmeCn5Cenu2TzdJSbDJnG
export const CHARLIE_KEY = [
  33, 178, 190, 155, 118, 88, 234, 29, 5, 42, 12, 137, 23, 88, 126, 45, 79, 135, 104, 96, 63, 21, 164, 227, 47, 186, 23,
  34, 4, 118, 171, 3, 173, 214, 17, 82, 109, 221, 174, 100, 139, 116, 83, 71, 108, 118, 248, 147, 253, 13, 46, 65, 128,
  143, 240, 255, 101, 169, 208, 156, 103, 98, 17, 133,
]

// DAVEXJQuNAzUaVZsFeDiUr67WikDH3cj4L1YHyx5t2Nj
export const DAVE_KEY = [
  99, 184, 26, 205, 22, 184, 129, 159, 152, 181, 28, 169, 124, 74, 249, 50, 233, 159, 85, 86, 195, 237, 252, 22, 140,
  73, 253, 235, 97, 243, 180, 21, 180, 186, 100, 202, 161, 4, 96, 215, 244, 173, 174, 184, 79, 108, 59, 85, 0, 114, 203,
  238, 237, 212, 159, 220, 81, 103, 142, 111, 199, 18, 74, 168,
]

// oWNEYV3aMze3CppdgyFAiEj9xUJXkn85es1KscRHt8m
export const OWNER_KEY = [
  24, 20, 238, 188, 26, 234, 120, 209, 88, 63, 170, 46, 66, 98, 21, 113, 194, 120, 143, 228, 231, 37, 91, 0, 242, 32,
  180, 99, 243, 179, 57, 144, 11, 233, 235, 235, 203, 20, 105, 33, 47, 140, 152, 253, 12, 148, 72, 175, 141, 253, 242,
  110, 225, 110, 21, 211, 118, 87, 111, 206, 208, 166, 190, 78,
]

export const aliceKeypair = Keypair.fromByteArray(ALICE_KEY)
export const aliceTokenAccount = 'Ebq6K7xVh6PYQ8DrTQnD9fC91uQiyBMPGSV6JCG6GPdD'

export const bobKeypair = Keypair.fromByteArray(BOB_KEY)

export const charlieKeypair = Keypair.fromByteArray(CHARLIE_KEY)

export const daveKeypair = Keypair.fromByteArray(DAVE_KEY)

export const ownerKeypair = Keypair.fromByteArray(OWNER_KEY)

export const usdcMint = 'USDzo281m7rjzeZyxevkzL1vr5Cibb9ek3ynyAjXjUM'
