* Get type checking working in jest tests
* Originator should match immediate peers (reuse with participant)
* Key and resource lifetime hooks (hold at promise, release at majority vote received)
* Persist and rehydrate unfinished requests on participant like is done on originator
* License
* Maintain TransactionId history to validate TransactionId uniqueness
* Quotas & metrics
* Balance advertising
* Consider allowing for publicly identifiable links (don't nonce encode)
* Support local state as well as current reentrance ticket

Transactions:
* Have originator verify that target's signature matches target's PK as given by its address
* Verify PK matches SK for specific path during promise
* Identity verification "whispering" (hash of identity information shared with peer of peer using PK)
