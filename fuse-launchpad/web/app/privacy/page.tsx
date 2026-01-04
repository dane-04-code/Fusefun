"use client";

export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: January 4, 2026</p>

            <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
                    <p>
                        This Privacy Policy explains how Fuse ("we," "us," or "our") collects, uses, and protects
                        information when you use our decentralized token launchpad platform ("Service"). We are
                        committed to protecting your privacy while providing a transparent, blockchain-based service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>

                    <h3 className="text-lg font-medium text-white mt-4 mb-2">2.1 Information You Provide</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong className="text-white">Wallet Address:</strong> Your public Solana wallet address when you connect</li>
                        <li><strong className="text-white">Token Information:</strong> Names, symbols, descriptions, and images for tokens you create</li>
                        <li><strong className="text-white">Social Links:</strong> Twitter, Telegram, or website URLs you optionally provide</li>
                        <li><strong className="text-white">Referral Data:</strong> Referral relationships between wallet addresses</li>
                    </ul>

                    <h3 className="text-lg font-medium text-white mt-4 mb-2">2.2 Information Collected Automatically</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong className="text-white">Transaction Data:</strong> All blockchain transactions are public and permanent</li>
                        <li><strong className="text-white">Device Information:</strong> Browser type, operating system, and IP address (for security)</li>
                        <li><strong className="text-white">Usage Data:</strong> Pages visited, features used, and interaction patterns</li>
                        <li><strong className="text-white">Cookies:</strong> Essential cookies for wallet connection and session management</li>
                    </ul>

                    <h3 className="text-lg font-medium text-white mt-4 mb-2">2.3 Blockchain Data</h3>
                    <p className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                        <strong className="text-blue-400">Important:</strong> All transactions on Solana are publicly visible and permanent.
                        This includes token creations, trades, and wallet addresses. This is inherent to blockchain technology
                        and cannot be changed or deleted.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
                    <p>We use collected information to:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Provide and maintain the Service</li>
                        <li>Process transactions and calculate fees</li>
                        <li>Display token information and trading data</li>
                        <li>Track referral rewards</li>
                        <li>Prevent fraud and abuse</li>
                        <li>Improve the user experience</li>
                        <li>Comply with legal obligations</li>
                        <li>Communicate important updates about the Service</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">4. Information Sharing</h2>
                    <p>We do NOT sell your personal information. We may share information with:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li><strong className="text-white">Blockchain Networks:</strong> Transaction data is broadcast to Solana (publicly visible)</li>
                        <li><strong className="text-white">IPFS/Pinata:</strong> Token images and metadata are stored on decentralized storage</li>
                        <li><strong className="text-white">RPC Providers:</strong> We use third-party RPC nodes (like Helius) to interact with Solana</li>
                        <li><strong className="text-white">Analytics Providers:</strong> Anonymized usage data for improving the Service</li>
                        <li><strong className="text-white">Legal Authorities:</strong> When required by law or to protect our rights</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">5. Data Storage and Security</h2>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>We use industry-standard security measures to protect your data</li>
                        <li>Wallet private keys are NEVER stored or transmitted by us</li>
                        <li>Data is stored on secure servers and decentralized networks</li>
                        <li>We cannot guarantee absolute security of any internet transmission</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">6. Your Rights</h2>
                    <p>Depending on your jurisdiction, you may have the right to:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Access the personal data we hold about you</li>
                        <li>Request correction of inaccurate data</li>
                        <li>Request deletion of your data (where technically possible)</li>
                        <li>Object to processing of your data</li>
                        <li>Data portability</li>
                    </ul>
                    <p className="mt-4 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                        <strong className="text-yellow-400">Note:</strong> Blockchain data cannot be deleted or modified due to the
                        immutable nature of the technology. This includes all on-chain transactions, token creations, and trades.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">7. Cookies and Tracking</h2>
                    <p>We use essential cookies for:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Maintaining wallet connection sessions</li>
                        <li>Storing user preferences (like theme settings)</li>
                        <li>Tracking referral information</li>
                        <li>Security and fraud prevention</li>
                    </ul>
                    <p className="mt-4">
                        You can disable cookies in your browser, but some features may not work correctly.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">8. Third-Party Services</h2>
                    <p>We integrate with the following third-party services:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li><strong className="text-white">Solana Blockchain:</strong> For all transactions and smart contract interactions</li>
                        <li><strong className="text-white">Pinata/IPFS:</strong> For storing token images and metadata</li>
                        <li><strong className="text-white">Helius:</strong> RPC provider for blockchain queries</li>
                        <li><strong className="text-white">TradingView:</strong> For price charts</li>
                        <li><strong className="text-white">Wallet Providers:</strong> Phantom, Solflare, and other Solana wallets</li>
                    </ul>
                    <p className="mt-4">
                        Each of these services has their own privacy policies which govern their use of your data.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">9. Children's Privacy</h2>
                    <p>
                        The Service is not intended for users under 18 years of age. We do not knowingly collect
                        personal information from children. If you believe a child has provided us with personal
                        information, please contact us immediately.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">10. International Users</h2>
                    <p>
                        If you access the Service from outside our primary jurisdiction, your information may be
                        transferred to and processed in other countries. By using the Service, you consent to
                        this transfer.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of material changes
                        by posting the new policy on this page and updating the "Last updated" date. Your continued
                        use of the Service after changes constitutes acceptance of the updated policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">12. Contact Us</h2>
                    <p>
                        For questions about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Twitter/X: <a href="https://x.com/FuseyF16876" className="text-primary hover:underline">@FuseyF16876</a></li>
                    </ul>
                </section>

                <section className="border-t border-white/10 pt-8">
                    <p className="text-xs">
                        By using Fuse, you acknowledge that you have read and understood this Privacy Policy.
                    </p>
                </section>
            </div>
        </div>
    );
}
