import {
  Bytes,
  dataSource,
  DataSourceContext,
  DataSourceTemplate,
  log,
  ipfs,
} from '@graphprotocol/graph-ts';

import { PostCreated as PostCreatedEvent } from "../generated/LensHub/LensHub";
import { PostCreated, PostContent } from "../generated/schema";

const POST_ID_KEY = "postID";

export function handlePostCreated(event: PostCreatedEvent): void {
  // contentURI and profileID are no longer directly accessible from event.params
  // they are inside postParams, a custom type (struct) from LensHub smart contract
  let postData = event.params.postParams;
  let profileId = postData.profileId;
  let contentUri = postData.contentURI;

  // unique ID format for PostCreated: [profileId]-[pubId]
  let entity = new PostCreated(
    Bytes.fromUTF8(
      profileId.toString() + "-" + event.params.pubId.toString(),
    ),
  );

  entity.contentURI = contentUri;
  entity.ownerId = profileId;
  entity.timestamp = event.params.timestamp;

  entity.save();


  let arweaveIndex = entity.contentURI.indexOf("ar://");  //new format of arweave URI
  let ipfsIndex = entity.contentURI.indexOf("ipfs://");   //new format of ipfs URI

  // If both arweave and ipfsIndex return -1, which means the strings were not found.
  // At that point, there's nothing else to do, so the function ends.
  if (arweaveIndex == -1 && ipfsIndex == -1) {
    // log.warning("No Arweave or IPFS data found in contentURI: {}", [entity.contentURI]);
    return;
  }

  // PREPARE `CONTEXT` - PASS IN OUR ID
  // DataSourceContext() is passed in a key,value pair that is converted into Bytes
  // to be passed into other handlers. The key was defined outside this function as
  // POST_ID_KEY and the value is the entity.id. This allows consistency between
  // handlers as the data is being indexed.
  let context = new DataSourceContext();
  context.setBytes(POST_ID_KEY, entity.id);

  // If Arweave data or IPFS data is found in the URI, the data hash is extracted
  // from contentURI. We now have the three variables we need! Pass them into
  // .createWithContext() to trigger File Data Sources indexing!
  if (arweaveIndex != -1) {
    let hash = entity.contentURI.substr(5); // exclude "ar://" from contentURI string
    DataSourceTemplate.createWithContext("ArweaveContent", [hash], context);

    return;
  }

  if (ipfsIndex != -1) {
    let hash = entity.contentURI.substr(ipfsIndex + 7); // exclude "ipfs://" from contentURI string
    DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
  }
}


export function handlePostContent(content: Bytes): void {
  // Remember DataSourceTemplate.createWithContext()? We can access
  // everything we just passed into that method here!
  // Gather the `hash` aka the ID with dataSource.stringParam()
  // Gather the `context` that has our ID encoded as Bytes as dataSource.context(),
  // then decode it.
  let hash = dataSource.stringParam();
  let context = dataSource.context();
  let id = context.getBytes(POST_ID_KEY);

  // We pass in the same ID used in the previous `PostCreated` handler here to
  // link the on-chain PostCreated ID with the off-chain PostContent id.
  let post = new PostContent(id);

  post.hash = hash;
  post.content = content.toString();

  post.save();
}