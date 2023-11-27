* Add a public keys to each node in the path in discovery; generated for intermediate nodes; target address integrates PK for target
    * Store SKs for each path
    * Signatures not necessary since peers can already assume trusted partners?
* Key and resource lifetime hooks (hold at promise, release at majority vote received)
* Persist and rehydrate unfinished requests on participant like is done on originator
* License
* Maintain TransactionId history to validate TransactionId uniqueness
* Quotas & metrics
* Balance advertising
* Consider allowing for publicly identifiable links (don't nonce encode)

Transactions:
* Have originator verify that target's signature matches target's PK as given by its address
* Verify PK matches SK for specific path during promise