import * as math from 'mathjs';



export default {
    name: 'calc',
    aliases: ['calculate', 'math', 'calculator'],
    category: 'general',
    description: 'Advanced calculator with scientific functions',
    usage: 'calc <expression>',
    cooldown: 2,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const expression = args.join(' ');
        
        // Security: Block dangerous functions
        const dangerousFunctions = ['import', 'eval', 'function', 'Function', 'setTimeout', 'setInterval'];
        if (dangerousFunctions.some(func => expression.includes(func))) {
            return sock.sendMessage(from, {
                text: '❌ *Security Error*\n\nDangerous functions are not allowed in calculations.'
            });
        }
        
        try {
            // Create a limited scope for math.js
            const scope = {
                // Allow basic math constants
                pi: Math.PI,
                e: Math.E,
                phi: 1.618033988749,
                tau: 2 * Math.PI
            };
            
            const result = math.evaluate(expression, scope);
            
            // Format the result
            let formattedResult;
            if (typeof result === 'number') {
                if (result === Infinity) formattedResult = '∞';
                else if (result === -Infinity) formattedResult = '-∞';
                else if (isNaN(result)) formattedResult = 'NaN (Not a Number)';
                else if (Number.isInteger(result)) formattedResult = result.toString();
                else formattedResult = parseFloat(result.toFixed(10)).toString();
            } else {
                formattedResult = result.toString();
            }
            
            const response = `🧮 *Calculator*

📝 **Expression:** \`${expression}\`
✅ **Result:** \`${formattedResult}\`

💡 **Supported Operations:**
• Basic: + - × ÷ ( )
• Powers: ^ or **
• Functions: sin, cos, tan, log, sqrt
• Constants: pi, e, phi, tau

*Example:* calc 2^3 + sqrt(16)`;

            await sock.sendMessage(from, { text: response });
            
        } catch (error) {
            let errorMessage = 'Invalid mathematical expression';
            
            if (error.message.includes('Unexpected token')) {
                errorMessage = 'Syntax error in expression';
            } else if (error.message.includes('Undefined symbol')) {
                errorMessage = 'Unknown function or variable';
            } else if (error.message.includes('Wrong number of arguments')) {
                errorMessage = 'Incorrect number of arguments for function';
            }
            
            const response = `❌ *Calculation Error*

📝 **Expression:** \`${expression}\`
❌ **Error:** ${errorMessage}

💡 **Examples:**
• \`calc 2 + 2\`
• \`calc sqrt(25)\`  
• \`calc sin(pi/2)\`
• \`calc log(100, 10)\`
• \`calc (5 + 3) * 2\`

🔗 Use parentheses for complex expressions!`;

            await sock.sendMessage(from, { text: response });
        }
    }
};