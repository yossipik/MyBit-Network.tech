---
id: alphacontracts_contracts_AssetManager
title: AssetManager
---

<div class="contract-doc"><div class="contract"><h2 class="contract-header"><span class="contract-kind">contract</span> AssetManager</h2><div class="source">Source: <a href="https://github.com/MyBitFoundation/MyBit-Network.tech//blob/v0.0.0/contracts/alphacontracts/contracts/AssetManager.sol" target="_blank">alphacontracts/contracts/AssetManager.sol</a></div></div><div class="index"><h2>Index</h2><ul><li><a href="alphacontracts_contracts_AssetManager.html#LogAssetManagerReplaced">LogAssetManagerReplaced</a></li><li><a href="alphacontracts_contracts_AssetManager.html#LogEscrowUnlocked">LogEscrowUnlocked</a></li><li><a href="alphacontracts_contracts_AssetManager.html#accessApproved">accessApproved</a></li><li><a href="alphacontracts_contracts_AssetManager.html#anyOwner">anyOwner</a></li><li><a href="alphacontracts_contracts_AssetManager.html#">fallback</a></li><li><a href="alphacontracts_contracts_AssetManager.html#releaseEscrow">releaseEscrow</a></li><li><a href="alphacontracts_contracts_AssetManager.html#replaceAssetManager">replaceAssetManager</a></li><li><a href="alphacontracts_contracts_AssetManager.html#unlockEscrow">unlockEscrow</a></li></ul></div><div class="reference"><h2>Reference</h2><div class="events"><h3>Events</h3><ul><li><div class="item event"><span id="LogAssetManagerReplaced" class="anchor-marker"></span><h4 class="name">LogAssetManagerReplaced</h4><div class="body"><code class="signature">event <strong>LogAssetManagerReplaced</strong><span>(bytes32 _assetID, address oldAssetManager, address _newManager) </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_assetID</code> - bytes32</div><div><code>oldAssetManager</code> - address</div><div><code>_newManager</code> - address</div></dd></dl></div></div></li><li><div class="item event"><span id="LogEscrowUnlocked" class="anchor-marker"></span><h4 class="name">LogEscrowUnlocked</h4><div class="body"><code class="signature">event <strong>LogEscrowUnlocked</strong><span>(bytes32 _assetID, address _user, uint _amount) </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_assetID</code> - bytes32</div><div><code>_user</code> - address</div><div><code>_amount</code> - uint</div></dd></dl></div></div></li></ul></div><div class="modifiers"><h3>Modifiers</h3><ul><li><div class="item modifier"><span id="accessApproved" class="anchor-marker"></span><h4 class="name">accessApproved</h4><div class="body"><code class="signature">modifier <strong>accessApproved</strong><span>(uint _accessLevel) </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_accessLevel</code> - uint</div></dd></dl></div></div></li><li><div class="item modifier"><span id="anyOwner" class="anchor-marker"></span><h4 class="name">anyOwner</h4><div class="body"><code class="signature">modifier <strong>anyOwner</strong><span>() </span></code><hr/></div></div></li></ul></div><div class="functions"><h3>Functions</h3><ul><li><div class="item function"><span id="fallback" class="anchor-marker"></span><h4 class="name">fallback</h4><div class="body"><code class="signature">function <strong></strong><span>(address _database) </span><span>public </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_database</code> - address</div></dd></dl></div></div></li><li><div class="item function"><span id="releaseEscrow" class="anchor-marker"></span><h4 class="name">releaseEscrow</h4><div class="body"><code class="signature">function <strong>releaseEscrow</strong><span>(bytes32 _assetID, address _user, uint _amount) </span><span>internal </span></code><hr/><dl><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_assetID</code> - bytes32</div><div><code>_user</code> - address</div><div><code>_amount</code> - uint</div></dd></dl></div></div></li><li><div class="item function"><span id="replaceAssetManager" class="anchor-marker"></span><h4 class="name">replaceAssetManager</h4><div class="body"><code class="signature">function <strong>replaceAssetManager</strong><span>(address _newManager, bytes32 _assetID) </span><span>external </span><span>returns  (bool) </span></code><hr/><dl><dt><span class="label-modifiers">Modifiers:</span></dt><dd><a href="alphacontracts_contracts_AssetManager.html#anyOwner">anyOwner </a></dd><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_newManager</code> - address</div><div><code>_assetID</code> - bytes32</div></dd><dt><span class="label-return">Returns:</span></dt><dd>bool</dd></dl></div></div></li><li><div class="item function"><span id="unlockEscrow" class="anchor-marker"></span><h4 class="name">unlockEscrow</h4><div class="body"><code class="signature">function <strong>unlockEscrow</strong><span>(bytes32 _assetID) </span><span>external </span></code><hr/><dl><dt><span class="label-modifiers">Modifiers:</span></dt><dd><a href="alphacontracts_contracts_AssetManager.html#accessApproved">accessApproved </a></dd><dt><span class="label-parameters">Parameters:</span></dt><dd><div><code>_assetID</code> - bytes32</div></dd></dl></div></div></li></ul></div></div></div>