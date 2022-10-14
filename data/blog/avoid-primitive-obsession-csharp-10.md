---
title: Avoid primitive obsession using C#9 record structs
date: '2022-10-12'
tags: ['csharp', 'code smell', 'refactoring', 'type safety']
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

With 9 consecutive string parameters, it is very easy for parameters to be misplaced when this constructor is invoked, for example, `country` being swapped with `zipCode`. If not manually detected, this bug can easily make its way into production code since both parameters have the same type (`string`).

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

    // this method is used by ASP.NET minimal APIs to convert query parameter strings
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

Now if we were to invoke the constructor with parameters in the wrong order, e.g. `var event = new CheckoutEvent(zipCode, country);` we would encounter compile errors:

- Argument 1: cannot convert from 'ZipCode' to 'Country'
- Argument 2: cannot convert from 'Country' to 'ZipCode'

Thus forcing us to fix the ordering at compile time, without the need to write any unit tests.

## Decimal example

Another benefit of avoiding primitives is enhanced type safety. The `decimal` type can be any value between -7.9 × 10⁻²⁸ to 7.9 × 10²⁸, but in real world applications having such a vast range rarely makes sense. Measures such as a person's height, weight, or test score can never have negative values and realistically have upper limits. Some measures can have different values when expressed in different units, e.g. temperature (Celsius, Fahrenheit, or Kelvin). By storing the value in a ValueObject that validates during construction, we can confidently use the value in our application without having to pollute our code with checks or converter methods. We only need to unit test our ValueObject instead of every unit that uses the value.

```csharp
var vatFraction = new Fraction(0.2m);
Console.WriteLine($"VAT is charged at {vatFraction.ToPercentage()}%");

public readonly record struct Fraction
{
    readonly decimal _value;

    public Fraction(decimal value)
    {
        if (value < 0 || value > 1) 
            throw new ArgumentException($"{value} must be between 0 and 1");
        _value = value;
    }

    public static implicit operator decimal(Fraction other) => other._value;

    public Percentage ToPercentage() => new(_value * 100);
}

public readonly record struct Percentage
{
    readonly decimal _value;

    public Percentage(decimal value)
    {
        if (value < 0 || value > 100) 
            throw new ArgumentException($"{value} must be between 0 and 100");
        _value = value;
    }

    public static implicit operator decimal(Percentage other) => other._value;

    public Fraction ToFraction() => new(_value / 100);
}
```
