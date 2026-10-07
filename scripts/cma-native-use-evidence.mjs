import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const claims={
  "98807": {
    "title": "Bowl with Floral Scroll Design in Relief",
    "field": "description",
    "quote": "including this elegant tea bowl",
    "accession": "1918.483",
    "url": "https://clevelandart.org/art/1918.483",
    "descriptionSha256": "e7b3d0c1ec5fcccb6859b977065e58b11ae6a1655a152eb051d281518144bc1f"
  },
  "142815": {
    "title": "Covered Hot Water Pot",
    "field": "did_you_know",
    "quote": "This covered hot water pot is part of a larger tea set.",
    "accession": "1966.500.2",
    "url": "https://clevelandart.org/art/1966.500.2",
    "descriptionSha256": "72868772f5658b710937181f75ee8f42b5e2202a071a6c033c1c0ab4f1d13077"
  },
  "150157": {
    "title": "Tray",
    "field": "did_you_know",
    "quote": "This tray is part of a tea and coffee service designed by Carlo Bugatti.",
    "accession": "1980.74.1",
    "url": "https://clevelandart.org/art/1980.74.1",
    "descriptionSha256": "39a78ec09a658586c83e8948485d86d2545f921bbb66d9bf398fe373dcb08198"
  },
  "150158": {
    "title": "Creamer",
    "field": "did_you_know",
    "quote": "This creamer is part of a tea and coffee service designed by Carlo Bugatti.",
    "accession": "1980.74.2",
    "url": "https://clevelandart.org/art/1980.74.2",
    "descriptionSha256": "ceeaae83c5858d37f6ec6bd49d972db75005c9fa2ce3494e2d05c36fca77e3c5"
  },
  "142826": {
    "title": "Creamer",
    "field": "did_you_know",
    "quote": "This creamer is part of a larger tea service.",
    "accession": "1966.500.7",
    "url": "https://clevelandart.org/art/1966.500.7",
    "descriptionSha256": "1ba8c3c27f394eac928d5683af1c0d22d84646efa658b0dabfb98c92cc32b260"
  },
  "142825": {
    "title": "Cake Basket",
    "field": "did_you_know",
    "quote": "This cake basket is part of a larger tea service.",
    "accession": "1966.500.6",
    "url": "https://clevelandart.org/art/1966.500.6",
    "descriptionSha256": "ac42f290974f007db328957df1e55b7f7bccf1c4750b6b6bc57b99b139aa8005"
  },
  "142824": {
    "title": "Jam (Varenye) Basket",
    "field": "did_you_know",
    "quote": "This jam (<em>varenye</em>) basket is part of a larger tea set.",
    "accession": "1966.500.5",
    "url": "https://clevelandart.org/art/1966.500.5",
    "descriptionSha256": "e8c0e072c5dd65e93c3175046724077330ae3429a5546f2bf894e9c65f2e15c8"
  }
};
export function cmaNativeTeaUseReview(raw){
 const claim=claims[String(raw.id)];if(!claim)return null;
 assert.equal(raw.title,claim.title,'Object-specific native title');
 assert.equal(raw.accession_number,claim.accession);assert.equal(raw.url,claim.url);
 assert.equal(raw.share_license_status,'CC0','Selected Cleveland image must remain CC0');
 const text=raw[claim.field];assert.equal(typeof text,'string');assert(text.includes(claim.quote),'Object-specific museum tea-use quote changed');assert.equal(crypto.createHash('sha256').update(text).digest('hex'),claim.descriptionSha256,'Native-use source snapshot changed');
 assert.match(raw.url,/^https:\/\/(?:www\.)?clevelandart\.org\/art\//,'Official Cleveland source');
 return {sourceUrl:raw.url,sourceField:claim.field,sourceQuote:claim.quote,descriptionSha256:crypto.createHash('sha256').update(text).digest('hex'),evidence:'The museum specifically identifies this registered object as a tea vessel or component of a tea service; no function inferred from its shape.'};
}
export function cmaReviewedNativeQuote(artwork,review){
 const claim=claims[String(artwork.id||'').replace(/^cma-/,'')];
 if(!claim||artwork.sourceMuseumEnglish!=='Cleveland Museum of Art'||artwork.titleOriginal!==claim.title||!review)return '';
 if(artwork.accessionNumber!==claim.accession||artwork.sourceUrl!==claim.url||review.sourceUrl!==artwork.sourceUrl||review.sourceField!==claim.field||review.sourceQuote!==claim.quote||!/^https:\/\/(?:www\.)?clevelandart\.org\/art\//.test(review.sourceUrl)||review.descriptionSha256!==claim.descriptionSha256)return '';
 return claim.quote;
}
