module.exports = {
    source: {
        include: ['src'],
        includePattern: '.+\\.(js|ts)$',
    },
    plugins: ['node_modules/jsdoc-ts-utils'],
    opts: {
        recurse: true,
        destination: './docs',
        template: 'node_modules/clean-jsdoc-theme',
    },
    typescript: {
        moduleRoot: 'src'
    },
    templates: {
        cleverLinks: true,
        monospaceLinks: true,
        default: {
            outputSourceFiles: true,
            includeDate: true
        },
        'clean-jsdoc-theme': {
            name: 'Project Documentation',
            darkMode: true,
            search: true,
            menu: {
                'GitHub': {
                    href: 'https://github.com/RobinHil/api-rest-project',
                    target: '_blank'
                }
            }
        }
    }
}