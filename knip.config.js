export default {
    entry: ['src/app/**/*.tsx', 'src/pages/**/**/*.tsx'],
    ignore: ['**/*.test.{js,ts,tsx}', '**/*.stories.{js,ts,tsx}'],
    ignoreBinaries: ['next'],
    ignoreDependencies: ['@types/*']
  };