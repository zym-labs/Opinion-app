// Local accessibility lint rules (STAGE6 §10). eslint-plugin-react-native-a11y only supports ESLint <= 8.
const attr = (node, name) => node.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);
const spreads = (node) => node.attributes.some((a) => a.type === 'JSXSpreadAttribute');
const nameOf = (node) => (node.name.type === 'JSXIdentifier' ? node.name.name : null);

module.exports = {
  rules: {
    // Screen readers announce what a control is only if it has a role.
    'pressable-has-role': {
      meta: { type: 'problem', messages: { missing: '{{name}} needs accessibilityRole (e.g. "button", "checkbox", "radio").' } },
      create: (context) => ({
        JSXOpeningElement(node) {
          const name = nameOf(node);
          if (!['Pressable', 'TouchableOpacity', 'TouchableHighlight'].includes(name)) return;
          if (spreads(node) || attr(node, 'accessibilityRole') || attr(node, 'role')) return;
          context.report({ node, messageId: 'missing', data: { name } });
        },
      }),
    },
    // Images need a description, or must be marked decorative.
    'image-has-label': {
      meta: { type: 'problem', messages: { missing: 'Image needs accessibilityLabel, or accessible={false} if decorative.' } },
      create: (context) => ({
        JSXOpeningElement(node) {
          if (nameOf(node) !== 'Image') return;
          if (spreads(node) || attr(node, 'accessibilityLabel') || attr(node, 'alt') || attr(node, 'accessible')) return;
          context.report({ node, messageId: 'missing' });
        },
      }),
    },
  },
};
