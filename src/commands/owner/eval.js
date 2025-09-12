module.exports = {
    name: 'eval',
    aliases: ['e', 'evaluate'],
    category: 'owner',
    description: 'Execute JavaScript code (DANGEROUS - Owner Only)',
    usage: 'eval <code>',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const code = args.join(' ');
            
            // Security warning
            await sock.sendMessage(from, {
                text: `⚠️ *SECURITY WARNING*\n\n🔴 **DANGER:** Executing arbitrary code\n📝 **Code:** \`${code.length > 100 ? code.substring(0, 100) + '...' : code}\`\n\n⏳ Executing...`
            });
            
            // Create a safer execution context
            const startTime = Date.now();
            let result;
            let error = null;
            
            try {
                // Wrap in async function to handle both sync and async code
                const asyncCode = `(async () => { ${code} })()`;
                result = await eval(asyncCode);
                
                // Convert result to string
                if (typeof result === 'object') {
                    result = JSON.stringify(result, null, 2);
                } else {
                    result = String(result);
                }
                
            } catch (evalError) {
                error = evalError;
                result = error.stack || error.message || 'Unknown error';
            }
            
            const executionTime = Date.now() - startTime;
            
            // Prepare response
            const response = `${error ? '❌' : '✅'} *Code Execution ${error ? 'Failed' : 'Complete'}*\n\n📝 **Code:**\n\`\`\`javascript\n${code}\n\`\`\`\n\n📤 **Result:**\n\`\`\`\n${result.length > 2000 ? result.substring(0, 2000) + '...[truncated]' : result}\n\`\`\`\n\n⏱️ **Execution Time:** ${executionTime}ms\n🔒 **Security Level:** MAXIMUM RISK\n\n${error ? '⚠️ *Error occurred during execution*' : '✅ *Execution completed successfully*'}`;
            
            await sock.sendMessage(from, { text: response });
            
        } catch (error) {
            console.error('Eval command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Critical Eval Error*\n\n**Error:** ${error.message}\n**Stack:** ${error.stack}\n\n🚨 **SECURITY ALERT:** Code execution failed\n⚠️ **This could indicate a security issue or system error**\n\n**Recommended actions:**\n• Check system security\n• Review executed code\n• Monitor for suspicious activity\n• Consider restarting bot if needed`
            });
        }
    }
};