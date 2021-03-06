
import * as _ from "lodash";
import {DeepValidator} from "../src/deep-validator";

let v, t, f;

describe("Flow", () => {
    describe("include", () => {
        it("should initiate self reference", () => {
            v = new DeepValidator({
                a: [
                    ["include", "self"]
                ]
            });

            expect(v._includedPending.length).toBe(0);

            expect(v._schema.properties.a.current.v[0].validator).toBe(v);
        });

        it("should pend for external", () => {
            v = new DeepValidator({
                a: [
                    ["include", "test"]
                ]
            });

            expect(v._includedPending.length).toBe(1);

            expect(v._includedPending[0]).toBe("test");
        });

        it("should link external on definition", () => {
            v = new DeepValidator({
                a: [
                    ["include", "test"]
                ]
            });

            t = new DeepValidator({}).setName("test");

            v.include(t);

            expect(v._includedPending.length).toBe(0);

            expect(v._schema.properties.a.current.v[0].validator).toBe(t);
        });
    });

    describe("root", () => {
        it("should be applied", () => {
            v = new DeepValidator({
                b: "isString",
            }, [["filterKeys", /^(a)$/]]);

            t = {b: "1"};

            expect(v.validate(t)).toBeTruthy();

            expect(t).toEqual({});
        });

        it("should return error message without internal root prefix", () => {
            v = new DeepValidator({
                b: "isString:not string",
            }, [["filterKeys", /^(b)$/]]);

            t = {b: 1};

            expect(v.validate(t)).toBeFalsy();

            expect(v.getErrors()).toEqual({"b": "not string"});
        });
    });

    it("isExists, default, showAs, custom", () => {
        v = new DeepValidator({
            a: [
                "isExists:not exists", "showAs:aaa",
            ],
        });

        expect(v.validate({})).toBe(false);

        expect(v.getErrors()).toEqual({"aaa": "not exists"});

        v = new DeepValidator({
            a: [
                "required:not exists", "showAs:aaa",
            ],
        });

        expect(v.validate({})).toBe(false);

        expect(v.getErrors()).toEqual({"aaa": "not exists"});

        v = new DeepValidator({
            a: [
                ["default", 1],
            ],
        });

        expect(v.validate(t = {})).toBe(true);

        expect(t).toEqual({a: 1});

        v = new DeepValidator({
            a: [
                "isNumber", ["default", 1],
            ],
        });

        expect(v.validate(t = {a: 5})).toBe(true);

        expect(t).toEqual({a: 5});

        v = new DeepValidator({
            a: [
                "isNumber", ["default", (key: string): any => 2],
            ],
        });

        expect(v.validate(t = {})).toBe(true);

        expect(t).toEqual({a: 2});

        v = new DeepValidator({
            b: [
                [
                    "custom",
                    (key, ref) => {
                        return "c" in ref;
                    }
                ]
            ]
        });

        expect(v.validate(t = {a: 5})).toBe(true);

        expect(t).toEqual({a: 5});

        f = () => new DeepValidator({a: [["custom", null]]});

        expect(f).toThrow(new Error("Validator of [custom] must be a function."));
    });

    it("Errors iterator", () => {
        v = new DeepValidator({
            a: [
                "isExists:not exists"
            ],
            b: [
                "isString:not string"
            ]
        });

        expect(v.tryAll().validate({b: 1})).toBe(false);

        expect(v.getErrors()).toEqual({"a": "not exists", "b": "not string"});

        expect(v.getNextError()).toEqual({field: "a", message: "not exists"});

        expect(v.getNextError()).toEqual({field: "b", message: "not string"});

        expect(v.getNextError()).toBe(void 0);
    });

    it("Errors", () => {
        f = () => new DeepValidator({a: ["dummy"]});

        expect(f).toThrow(new Error("Validator is not defined: dummy"));

        f = () => new DeepValidator({a: [["if"]]});

        expect(f).toThrow(new Error("Validator of [if] must contain a condition checker and sub-flows."));

        f = () => new DeepValidator({a: [["if", true, new DeepValidator({}), new DeepValidator({})]]});

        expect(f).toThrow(new Error("Validator of [if] must define a valid condition checker."));

        f = () => new DeepValidator({a: [["if", "dummy", new DeepValidator({}), new DeepValidator({})]]});

        expect(f).toThrow(new Error("Condition checker is not defined or invalid: dummy"));

        f = () => new DeepValidator({a: [["if", "dummy", 1, 2]]});

        expect(f).toThrow(new Error("Validator of [if] must define a valid sub-flows instances of [DeepValidator]."));

        f = () => new DeepValidator({a: [["if", "dummy", {}, 2]]});

        expect(f).toThrow(new Error("Validator of [if] must define a valid sub-flows instances of [DeepValidator]."));
    });

    it("Array allow", () => {
        v = new DeepValidator({
            a: [
                "isString:not string"
            ],
            b: [
                "isNumber:not number"
            ]
        });

        expect(v.setMessageInvalid("invalid").validate([{a: 5}])).toBe(false);

        expect(v.getErrors()).toEqual({"??": "invalid"});

        v.arrayAllow();

        expect(v.validate([{a: 5}])).toBe(false);

        expect(v.getErrors()).toEqual({"0.a": "not string"});

        v.arrayAllow(false);

        expect(v.setMessageInvalid("invalid ...").validate([{a: 5}])).toBe(false);

        expect(v.getErrors()).toEqual({"??": "invalid ..."});
    });

    it("Single, tryAll", () => {
        v = new DeepValidator({
            a: [
                "isString:not string"
            ],
            b: [
                "isNumber:not number"
            ]
        });

        expect(v.validate({a: 5, b: "5"})).toBe(false);

        expect(v.getErrors()).toEqual({a: "not string"});

        v.tryAll();
        
        expect(v.validate({a: 5, b: "5"})).toBe(false);
        
        expect(v.getErrors()).toEqual({a: "not string", b: "not number"});

        v.tryAll(false);

        expect(v.validate({a: 5, b: "5"})).toBe(false);

        expect(v.getErrors()).toEqual({a: "not string"});
    });

    it("Strict", () => {
        v = new DeepValidator({
            a: [
                "isString:not string"
            ],
            b: [
                "isNumber:not number"
            ]
        });

        expect(v.validate({})).toBe(true);

        expect(v.getErrors()).toEqual({});

        v.strict().setMessageMissingKey("is missing");

        expect(v.validate({})).toBe(false);

        expect(v.getErrors()).toEqual({a: "is missing"});

        v.strict(false);

        expect(v.validate({})).toBe(true);

        expect(v.getErrors()).toEqual({});
    });

    it("Nested [DeepValidator] error messages combination", () => {
        v = new DeepValidator({
            a: [
                new DeepValidator({
                    b: [
                        "isString:not string"
                    ]
                })
            ],
            b: [
                "isNumber:not number"
            ]
        });

        expect(v.tryAll().validate({a: {b: 5}, b: 5})).toBe(false);

        expect(v.getErrors()).toEqual({"a.b": "not string"});

        v = new DeepValidator({
            a: [
                {
                    b: [
                        "isString:not string"
                    ]
                }
            ],
            b: [
                "isNumber:not number"
            ]
        });

        expect(v.tryAll().validate({a: {b: 5}, b: 5})).toBe(false);

        expect(v.getErrors()).toEqual({"a.b": "not string"});
    });

    it("Custom validator/sanitizer", () => {
        v = new DeepValidator({
            a: [
                (v, k, d) => {
                    d[k] = 321;

                    return "error";
                }
            ],
        });

        expect(v.validate({a: 123})).toBe(false);

        expect(v.getErrors()).toEqual({"a": "error"});

        v = new DeepValidator({
            a: [
                (v, k, d) => {
                    d[k] = 321;

                    return true;
                }
            ],
        });

        expect(v.validate(t = {a: 123})).toBe(true);

        expect(t).toEqual({a: 321});
    });

    it("If", () => {
        v = new DeepValidator({
            "a.b": [
                [
                    'if',
                    'isString',
                    {b: ['isNumber:not number']},
                    {b: ['isString:not string']}
                ]
            ],
        });

        expect(v.validate({a: {b: 1}})).toBe(false);

        expect(v.getErrors()).toEqual({"a.b": "not string"});

        v = new DeepValidator({
            "a.b": [
                [
                    'if',
                    'isString',
                    {b: ['isString:not string']},
                    {b: ['isNumber:not number']}
                ]
            ],
        });

        expect(v.validate({a: {b: 1}})).toBe(true);

        expect(v.getErrors()).toEqual({});

        v = new DeepValidator({
            "a.b": [
                [
                    'if',
                    (val) => _.isString(val),
                    {b: ['isNumber:not number']},
                    {b: ['isString:not string']}
                ]
            ],
        });

        expect(v.validate({a: {b: 1}})).toBe(false);

        expect(v.getErrors()).toEqual({"a.b": "not string"});

        v = new DeepValidator({
            "a.b": [
                [
                    'if',
                    (val) => _.isString(val),
                    {b: ['isString:not string']},
                    {b: ['isNumber:not number']}
                ]
            ],
        });

        expect(v.validate({a: {b: 1}})).toBe(true);

        expect(v.getErrors()).toEqual({});
    });

    it("List", () => {
        v = new DeepValidator({
            a: [
                ['isArray:not array']
            ],
            'a.[]': [
                'isString:not string'
            ]
        });

        expect(v.validate({a: ["a", "b", 1]})).toBe(false);

        expect(v.getErrors()).toEqual({"a.2": "not string"});

        expect(v.validate({a: ["a", "b", "c"]})).toBe(true);

        expect(v.getErrors()).toEqual({});
    });

    it("Max depth", () => {
        v = new DeepValidator({
            a: [
                'isExists:required'
            ],
            'a.b': [
                'isExists:required'
            ],
            'a.b.c': [
                'isExists:required'
            ]
        }).setMessageMaxDepthReached('max depth reached').maxDepth(2);

        expect(v.validate({a: {b: {c: 1}}})).toBe(false);

        expect(v.getErrors()).toEqual({'a.b.*': 'max depth reached'});

        v = new DeepValidator({
            a: [
                'isExists:required',
                {
                    'b': [
                        'isExists:required'
                    ],
                    'b.c': [
                        'isExists:required'
                    ]
                }
            ]
        }).setMessageMaxDepthReached('max depth reached').maxDepth(2);

        expect(v.validate({a: {b: {c: 1}}})).toBe(false);

        expect(v.getErrors()).toEqual({'a.b.*': false});

        v = new DeepValidator({
            a: [
                'isExists:required',
                {
                    'b': [
                        'isExists:required'
                    ],
                    'b.c': [
                        'isExists:required'
                    ]
                }
            ]
        }).setMessageMaxDepthReached('max depth reached').maxDepthPassToNested(false).maxDepth(2);

        expect(v.validate({a: {b: {c: 1}}})).toBe(true);
    });

    it("Translator", () => {
        let mes = {
            _not_exists: 'not exists'
        };

        v = new DeepValidator({
            a: [
                "isExists:_not_exists"
            ],
            b: [
                "isString:_not_string"
            ]
        }).setTranslator((message: string) => {
            return mes[message] || message;
        }).tryAll();

        expect(v.validate({b: 123})).toBe(false);

        expect(v.getErrors()).toEqual({a: "not exists", b: "_not_string"})
    });
});
