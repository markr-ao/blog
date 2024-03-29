---
title: Avoid primitive obsession using C#10 record structs
date: '2022-10-12'
tags: ['csharp', 'code smell', 'refactoring', 'type safety']
images: ['/static/images/avoid-primitive-obsession-csharp-10/card.png']
draft: false
summary: Catch errors at compile time, without having to write unit tests, using ValueObjects in place of primitives.
---

## Problem

A common pattern in C# is constructors or methods with a large number of parameters, for example in Microsoft's [eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers/blob/dev/src/Services/Basket/Basket.API/IntegrationEvents/Events/UserCheckoutAcceptedIntegrationEvent.cs#L37) solution:

```csharp
public UserCheckoutAcceptedIntegrationEvent(string userId, string userName, string city, string street,
string state, string country, string zipCode, string cardNumber, string cardHolderName,
DateTime cardExpiration, string cardSecurityNumber, int cardTypeId, string buyer, Guid requestId,
CustomerBasket basket)
```

With 9 consecutive string parameters, it is very easy for arguments to be misplaced when this constructor is invoked, for example, `country` being swapped with `zipCode`. If not manually detected, this bug can easily make its way into production code since both parameters have the same type (`string`).

## Solution

Using `record struct`s, we can replace some or all of these primitive types with specific types known as [ValueObjects](https://www.martinfowler.com/bliki/ValueObject.html) (for the sake of brevity, I have simplified the constructor to 2 parameters):

```csharp
// CheckoutEvent.cs
public CheckoutEvent(Country country, ZipCode zipCode)

// Country.cs
public readonly record struct Country
{
    readonly string _value;
    static readonly string[] _validCountries = { "United States", "Canada" };

    // consider making this private to force construction via TryParse
    public Country(string value) => _value = value;

    public static implicit operator string(Country other) => other._value;

    // this method is used by ASP.NET minimal APIs to deserialise URL query string parameters
    public static bool TryParse(string input, out Country output)
    {
        // validation logic goes here
        var isValid = _validCountries.Contains(input);
        output = new(input);
        return isValid;
    }
}

// ZipCode.cs
public readonly record struct ZipCode
{
    readonly string _value;
    public ZipCode(string value) => _value = value;
    public static implicit operator string(ZipCode other) => other._value;

    public static bool TryParse(string input, out ZipCode output)
    {
        var isValid = input.Length >= 5 && input.Length <= 6;
        output = new(input);
        return isValid;
    }
}
```

Now if we were to invoke the constructor with arguments in the wrong order, e.g. `var event = new CheckoutEvent(zipCode, country);` we would encounter compile errors:

- Argument 1: cannot convert from 'ZipCode' to 'Country'
- Argument 2: cannot convert from 'Country' to 'ZipCode'

Thus forcing us to fix the ordering at compile time, without the need to write any unit tests.

## Decimal example

Another benefit of avoiding primitives is enhanced type safety. The `decimal` type can be any value between -7.9 × 10<sup>-28</sup> to 7.9 × 10<sup>28</sup>, but in real world applications having such a vast range rarely makes sense. Measures such as a person's height, weight, or test score can never have negative values and realistically have upper limits. By using ValueObjects, we can encapsulate this validation and confidently convert and persist the value.

```csharp
public readonly record struct HeightCentimetres
{
    readonly decimal _value;

    public HeightCentimetres(decimal value)
    {
        if (value < 20 || value > 300)
            throw new ArgumentException($"{value} must be between 20 and 300");
        _value = value;
    }

    public static implicit operator decimal(HeightCentimetres other) => other._value;

    public HeightInches ToInches() => new(_value / 2.54);
}
```

## C#9 and earlier

If C#10 record structs are not available in your project, an alternative solution is to use the [VOGen](https://github.com/SteveDunn/Vogen) NuGet package, which uses .NET 5 source generators. If your code base is in .NET Core or .NET Framework, you can use [ValueOf](https://github.com/mcintyre321/ValueOf), however one caveat with this solution is that the ValueObject will be serialised to a boxed value (`"MyValueObject": { "Value": "value" }`), and the underlying value is not implicitly cast, it must be accessed via the public `.Value` property.
