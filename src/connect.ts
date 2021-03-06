import invariant = require('invariant');
import { Component } from 'preact';
import createClass from 'preact-classless-component';
import reactiveMixin from './reactiveMixin';
import inject from './inject';

const lifecycleMethods = [
	'componentWillMount',
	'componentWillUnmount',
	'componentDidMount',
	'componentDidUpdate'
];

/**
 * Wraps a component and provides stores as props
 */
function connect (arg1: string | any, arg2 = null): any {
	invariant(typeof arg1 !== 'string', 'Store names should be provided as array');

	if (Array.isArray(arg1)) {
		// component needs stores
		if (!arg2) {
			// invoked as decorator
			return componentClass => connect(arg1, componentClass);
		} else {
			// TODO: deprecate this invocation style
			return inject.apply(null, arg1)(connect(arg2));
		}
	}
	const componentClass = arg1;

	// Stateless function component:
	// If it is function but doesn't seem to be a class constructor, wrap it automatically
	if (typeof componentClass === 'function'
		&& (!componentClass.prototype || !componentClass.prototype.render)
		&& !componentClass.isReactClass
		&& !Component.isPrototypeOf(componentClass)
	) {
		const newClass = createClass({
			displayName: componentClass.displayName || componentClass.name,
			propTypes: componentClass.propTypes,
			contextTypes: componentClass.contextTypes,
			getDefaultProps: () => componentClass.defaultProps,
			render: () => componentClass.call(this, this.props, this.context)
		});

		return connect(newClass);
	}

	invariant(componentClass, 'Please pass a valid component to "observer"');

	const target = componentClass.prototype || componentClass;

	lifecycleMethods.forEach(funcName => patch(target, funcName));

	if (!target.shouldComponentUpdate) {
		target.shouldComponentUpdate = reactiveMixin.shouldComponentUpdate;
	}

	componentClass.isMobXReactObserver = true;
	return componentClass;
}

/**
 * Patch the component with reactive properties
 */
function patch (target, funcName) {
	const base = target[funcName];
	const mixinFunc = reactiveMixin[funcName];
	if (!base) {
		target[funcName] = mixinFunc;
	} else {
		target[funcName] = function() {
			base.apply(this, arguments);
            if (mixinFunc) {
                mixinFunc.apply(this, arguments);
            }
		};
	}
}

export default connect;
