# Snapshot report for `src/runner/__test__/WorkflowInstanceTest.ts`

The actual snapshot is saved in `WorkflowInstanceTest.ts.snap`.

Generated by [AVA](https://avajs.dev).

## finds all parameter references in a workflow

> Snapshot 1

    MapWithDefault @Map {
      factory: Function {},
      ---
      'aaveAsset' => [
        [
          '__step_0__',
          'inputAsset',
        ],
      ],
    }

## fails to validate when a parameter reference is not found in the declared parameters

> Snapshot 1

    Error (WorkflowValidationError) {
      problems: [
        {
          message: 'Parameter \'aaveAsset\' at path \'__step_0__.inputAsset\' was not declared in workflow.parameters',
          step: {
            inputAsset: '{{ aaveAsset }}',
            nextStepId: '__end__',
            stepId: '__step_0__',
            type: 'aave-supply',
          },
          stepId: '__step_0__',
          type: 'UndeclaredParameter',
        },
      ],
      message: 'Parameter \'aaveAsset\' at path \'__step_0__.inputAsset\' was not declared in workflow.parameters',
    }

## fails to validate when a parameter reference should be a different type than was declared in workflow.parameters

> Snapshot 1

    Error (WorkflowValidationError) {
      problems: [
        {
          message: 'parameter type \'address\' for parameter \'aaveAsset\' does not match expected type \'asset-amount\' at path \'__step_0__.inputAsset\'',
          step: {
            inputAsset: '{{ aaveAsset }}',
            nextStepId: '__end__',
            stepId: '__step_0__',
            type: 'aave-supply',
          },
          stepId: '__step_0__',
          type: 'ParameterTypeMismatch',
        },
      ],
      message: 'parameter type \'address\' for parameter \'aaveAsset\' does not match expected type \'asset-amount\' at path \'__step_0__.inputAsset\'',
    }

## fails to validate when there are undeclared arguments

> Snapshot 1

    Error (WorkflowArgumentError) {
      problems: [
        {
          argumentName: 'foo',
          message: 'Argument \'foo\' is not declared in workflow.parameters',
          type: 'MissingParameter',
        },
      ],
      message: 'Argument \'foo\' is not declared in workflow.parameters',
    }

## fails to validate when there are zod problems in the workflow

> Snapshot 1

    ZodError {
      addIssue: Function {},
      addIssues: Function {},
      issues: [
        {
          code: 'invalid_string',
          message: 'Invalid',
          path: [
            'steps',
            0,
            'amount',
          ],
          validation: 'regex',
        },
      ],
      message: `[␊
        {␊
          "validation": "regex",␊
          "code": "invalid_string",␊
          "message": "Invalid",␊
          "path": [␊
            "steps",␊
            0,␊
            "amount"␊
          ]␊
        }␊
      ]`,
    }

## fails to validate when there are zod problems in the arguments

> Snapshot 1

    Error (WorkflowArgumentError) {
      problems: [
        {
          argumentName: 'addAssetAmount',
          message: `[␊
            {␊
              "validation": "regex",␊
              "code": "invalid_string",␊
              "message": "Invalid",␊
              "path": []␊
            }␊
          ]`,
          parameterName: 'addAssetAmount',
          type: 'SchemaError',
          zodError: ZodError {
            addIssue: Function {},
            addIssues: Function {},
            issues: [
              {
                code: 'invalid_string',
                message: 'Invalid',
                path: [],
                validation: 'regex',
              },
            ],
            message: `[␊
              {␊
                "validation": "regex",␊
                "code": "invalid_string",␊
                "message": "Invalid",␊
                "path": []␊
              }␊
            ]`,
          },
        },
      ],
      message: `[␊
        {␊
          "validation": "regex",␊
          "code": "invalid_string",␊
          "message": "Invalid",␊
          "path": []␊
        }␊
      ]`,
    }

## fails to validate when arguments are not provided for all parameters

> Snapshot 1

    Error (WorkflowArgumentError) {
      problems: [
        {
          message: 'An argument was not provided for parameter \'addAssetAmount\'',
          parameterName: 'addAssetAmount',
          type: 'MissingArgument',
        },
      ],
      message: 'An argument was not provided for parameter \'addAssetAmount\'',
    }