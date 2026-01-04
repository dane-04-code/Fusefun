"use client";

export default function TermsPage() {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: January 4, 2026</p>

            <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using the Fuse platform ("Service"), you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, do not use the Service. We reserve the right to modify these
                        terms at any time, and your continued use constitutes acceptance of any changes.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">2. Nature of Service</h2>
                    <p className="mb-4">
                        Fuse is a decentralized token launchpad built on the Solana blockchain. The Service provides:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Token creation tools via smart contracts</li>
                        <li>Bonding curve trading mechanisms</li>
                        <li>Referral reward systems</li>
                        <li>User interface for blockchain interactions</li>
                    </ul>
                    <p className="mt-4">
                        <strong className="text-white">We do not provide custody of funds.</strong> All transactions occur directly
                        on the Solana blockchain, and you maintain full control of your wallet and assets at all times.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">3. Eligibility</h2>
                    <p>You must be at least 18 years old to use this Service. By using Fuse, you represent and warrant that:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>You are of legal age in your jurisdiction</li>
                        <li>You are not located in a jurisdiction where cryptocurrency trading is prohibited</li>
                        <li>You are not on any sanctions list or prohibited from using blockchain services</li>
                        <li>You have the legal capacity to enter into this agreement</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">4. Risks and Disclaimers</h2>
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg mb-4">
                        <p className="text-red-400 font-semibold mb-2">⚠️ HIGH RISK WARNING</p>
                        <p>
                            Cryptocurrency and token trading involves substantial risk of loss and is not suitable for every investor.
                            The value of tokens can fluctuate significantly, and you may lose some or all of your investment.
                        </p>
                    </div>
                    <p className="mb-4">By using this Service, you acknowledge and accept:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong className="text-white">No Guarantees:</strong> We make no guarantees about token performance, liquidity, or value</li>
                        <li><strong className="text-white">Smart Contract Risks:</strong> Smart contracts may contain bugs or vulnerabilities</li>
                        <li><strong className="text-white">Blockchain Risks:</strong> Transactions are irreversible once confirmed on the blockchain</li>
                        <li><strong className="text-white">Market Volatility:</strong> Token prices can change rapidly and unpredictably</li>
                        <li><strong className="text-white">Regulatory Uncertainty:</strong> Cryptocurrency regulations vary and may change</li>
                        <li><strong className="text-white">No Financial Advice:</strong> Nothing on this platform constitutes financial, investment, or legal advice</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">5. User Responsibilities</h2>
                    <p>You agree to:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Secure your wallet and private keys - we cannot recover lost funds</li>
                        <li>Verify all transaction details before signing</li>
                        <li>Conduct your own research before trading any tokens</li>
                        <li>Not use the Service for illegal activities, money laundering, or fraud</li>
                        <li>Not create tokens that infringe on intellectual property rights</li>
                        <li>Not attempt to manipulate markets or deceive other users</li>
                        <li>Comply with all applicable laws in your jurisdiction</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">6. Prohibited Activities</h2>
                    <p>You may NOT use the Service to:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Create tokens impersonating existing projects or individuals</li>
                        <li>Engage in pump-and-dump schemes</li>
                        <li>Launder money or finance terrorism</li>
                        <li>Exploit vulnerabilities in the smart contracts</li>
                        <li>Interfere with the operation of the Service</li>
                        <li>Violate any applicable laws or regulations</li>
                    </ul>
                    <p className="mt-4">
                        Violation of these terms may result in immediate termination of access and potential legal action.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">7. Fees</h2>
                    <p>The following fees apply to the Service:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li><strong className="text-white">Token Creation:</strong> 0.075 SOL platform fee</li>
                        <li><strong className="text-white">Trading:</strong> 1% bonding curve fee (80% protocol, 20% creator)</li>
                        <li><strong className="text-white">Platform Fee:</strong> 0.5% on trades</li>
                        <li><strong className="text-white">Network Fees:</strong> Standard Solana transaction fees apply</li>
                    </ul>
                    <p className="mt-4">Fees are subject to change with notice posted on the platform.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
                    <p className="mb-4">
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, FUSE AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS
                        SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                        INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Loss of profits, data, or other intangible losses</li>
                        <li>Losses resulting from unauthorized access to your wallet</li>
                        <li>Losses from smart contract failures or bugs</li>
                        <li>Losses from market volatility or token devaluation</li>
                        <li>Losses from blockchain network issues or downtime</li>
                    </ul>
                    <p className="mt-4">
                        Our total liability shall not exceed the fees you have paid to us in the 12 months preceding the claim.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">9. Indemnification</h2>
                    <p>
                        You agree to indemnify, defend, and hold harmless Fuse and its affiliates from any claims, damages,
                        losses, or expenses (including legal fees) arising from your use of the Service, violation of these
                        terms, or infringement of any third-party rights.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">10. Intellectual Property</h2>
                    <p>
                        The Fuse brand, logo, and proprietary software are owned by us. Users retain ownership of tokens
                        they create but grant us a license to display token information on the platform. You may not copy,
                        modify, or distribute our proprietary materials without permission.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">11. Termination</h2>
                    <p>
                        We may terminate or suspend your access to the Service at any time, without prior notice, for
                        conduct that we believe violates these terms or is harmful to other users, us, or third parties.
                        Upon termination, your right to use the Service ceases immediately.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">12. Governing Law</h2>
                    <p>
                        These terms shall be governed by and construed in accordance with applicable laws, without regard
                        to conflict of law principles. Any disputes shall be resolved through binding arbitration.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-white mb-4">13. Contact</h2>
                    <p>
                        For questions about these Terms of Service, please contact us through our official channels:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                        <li>Twitter/X: <a href="https://x.com/FuseyF16876" className="text-primary hover:underline">@FuseyF16876</a></li>
                    </ul>
                </section>

                <section className="border-t border-white/10 pt-8">
                    <p className="text-xs">
                        By using Fuse, you acknowledge that you have read, understood, and agree to be bound by these
                        Terms of Service. If you do not agree to these terms, please do not use the Service.
                    </p>
                </section>
            </div>
        </div>
    );
}
